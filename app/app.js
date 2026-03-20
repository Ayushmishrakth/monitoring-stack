'use strict';

// ──────────────────────────────────────────────────────────────
//  APM Platform — Node.js Application
//
//  Features:
//    ✅ Prometheus custom metrics (counter, histogram)
//    ✅ Structured JSON logging with Winston (includes traceId)
//    ✅ Multiple routes for realistic traffic patterns
//    ✅ Error simulation route
//    ✅ Slow/latency simulation route
//    ✅ Health check endpoint
// ──────────────────────────────────────────────────────────────

const express = require('express');
const client = require('prom-client');
const winston = require('winston');
const api = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Winston Logger (structured JSON) ────────────────────────
// WHY JSON? Promtail/Loki can parse structured logs and index
// fields like traceId for log ↔ trace correlation.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'apm-app' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Helper: extract current trace context and inject into log
function traceContext() {
  const span = api.trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    traceFlags: ctx.traceFlags,
  };
}

// ── Prometheus Metrics ──────────────────────────────────────
// Collect Node.js default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ prefix: 'apm_app_' });

// Counter: total HTTP requests (with labels)
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Counter: total errors
const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (status >= 400)',
  labelNames: ['method', 'route', 'status_code'],
});

// Histogram: request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Gauge: active requests
const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
});

// ── Metrics Middleware ──────────────────────────────────────
// Wraps every request to record duration, count, and errors.
app.use((req, res, next) => {
  // Skip metrics endpoint to avoid self-referencing noise
  if (req.path === '/metrics') return next();

  activeRequests.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    end(labels);
    httpRequestsTotal.inc(labels);
    activeRequests.dec();

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
});

// ── Routes ──────────────────────────────────────────────────

// Home
app.get('/', (req, res) => {
  logger.info('Request received at /', traceContext());
  res.json({
    message: 'Hello from APM Platform 🚀',
    timestamp: new Date().toISOString(),
  });
});

// Simulated API — Users
app.get('/api/users', (req, res) => {
  logger.info('Fetching users list', traceContext());
  const users = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'developer' },
    { id: 3, name: 'Charlie', role: 'viewer' },
  ];
  res.json({ users, count: users.length });
});

// Simulated API — Orders
app.get('/api/orders', (req, res) => {
  logger.info('Fetching orders list', traceContext());
  const orders = [
    { id: 101, item: 'Widget A', status: 'shipped' },
    { id: 102, item: 'Widget B', status: 'processing' },
  ];
  res.json({ orders, count: orders.length });
});

// Error endpoint — simulates 500 errors
app.get('/error', (req, res) => {
  logger.error('Intentional error triggered at /error', traceContext());
  res.status(500).json({ error: 'Internal Server Error', message: 'This is a simulated error' });
});

// Slow endpoint — simulates latency (1–3 seconds)
app.get('/slow', async (req, res) => {
  const delay = 1000 + Math.random() * 2000; // 1–3 seconds
  logger.warn(`Slow request — simulating ${Math.round(delay)}ms latency`, traceContext());
  await new Promise((resolve) => setTimeout(resolve, delay));
  res.json({ message: 'Slow response completed', latency_ms: Math.round(delay) });
});

// Health check — for Docker health checks and load balancers
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error('Failed to generate metrics', { error: err.message, ...traceContext() });
    res.status(500).end(err.message);
  }
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`, traceContext());
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// ── Error Handler ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, ...traceContext() });
  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`APM App running on port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || 'production',
  });
});