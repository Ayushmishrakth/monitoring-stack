'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// ──────────────────────────────────────────────────────────────
//  OpenTelemetry SDK Initialization
//
//  WHY a separate file?
//  The SDK must be initialized BEFORE any other module is loaded
//  so that auto-instrumentation can monkey-patch Express, HTTP,
//  etc.  We load this file with:
//      node --require ./tracing.js app.js
// ──────────────────────────────────────────────────────────────

const TEMPO_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  || 'http://tempo:4318/v1/traces';

const traceExporter = new OTLPTraceExporter({
  url: TEMPO_ENDPOINT,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'apm-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'production',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation — too noisy for production
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log('[tracing] OpenTelemetry SDK started — exporting to', TEMPO_ENDPOINT);

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[tracing] SDK shut down'))
    .catch((err) => console.error('[tracing] shutdown error', err))
    .finally(() => process.exit(0));
});
