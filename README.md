# APM Observability Platform (Production-Grade)

A complete, production-ready DevOps observability stack built with Node.js and the Grafana LGTM stack (Loki, Grafana, Tempo, Prometheus).

## 🚀 Features

-   **Application (Node.js)**:
    -   Exposes custom metrics via `prom-client` (Rate, Errors, Duration).
    -   Generates structured JSON logs using `winston`.
    -   Sends distributed traces using OpenTelemetry (OTLP HTTP).
-   **Monitoring Stack**:
    -   **Prometheus**: Metrics collection and alerting.
    -   **Loki**: Log aggregation with container auto-discovery.
    -   **Tempo**: High-scale distributed tracing.
    -   **Grafana**: Unified visualization with pre-provisioned dashboards and datasources.
-   **Observability Correlation**:
    -   **Log to Trace**: Click a `trace_id` in Loki to see the full Tempo trace.
    -   **Metric to Trace**: Prometheus exemplars link directly to Tempo.
    -   **Trace to Log**: Jump from a span in Tempo to the corresponding logs in Loki.

## 🛠 Prerequisites

-   Docker and Docker Compose
-   Node.js 18+ (for local development)

## 🏁 Quick Start

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd apm-platform
    ```

2.  **Start the entire stack**:
    ```bash
    docker compose up -d --build
    ```

3.  **Access the services**:
    -   **Application**: [http://localhost:3000](http://localhost:3000)
    -   **Grafana**: [http://localhost:3001](http://localhost:3001) (Login: `admin` / `admin`)
    -   **Prometheus**: [http://localhost:9090](http://localhost:9090)
    -   **Loki**: [http://localhost:3100](http://localhost:3100)
    -   **Tempo**: [http://localhost:3200](http://localhost:3200)

## 🚦 Usage & Testing

### Generate Traffic
Invoke these endpoints to see data in Grafana:
-   `/` - Normal request.
-   `/api/users` - Simulated API call.
-   `/slow` - Simulates 1–3s latency.
-   `/error` - Triggers a 500 Internal Server Error.

### Explore Observability
1.  Open **Grafana** → **Dashboards** → **APM Platform Overview**.
2.  Observe the **Service Health Score** and **P95 Latency**.
3.  Go to **Explore** → Select **Loki** → Run query `{compose_service="app"}`.
4.  Click on a `traceId` in any log line to visualize the trace in **Tempo**.

## 📁 Project Structure

```bash
apm-platform/
├── app/                  # Node.js Application
│   ├── app.js            # Core logic + Metrics + Logs
│   ├── tracing.js         # OpenTelemetry configuration
│   └── Dockerfile        # Multi-stage production build
├── monitoring/           # Monitoring Stack Config
│   ├── grafana/          # Provisioning, Dashboards, Alerting
│   ├── loki/             # Loki storage & indexing
│   ├── prometheus/       # Scrape & alerting rules
│   ├── promtail/         # Log collection pipeline
│   └── tempo/            # Tracing backend
└── docker-compose.yml    # Main orchestration file
```

## ⚠️ Troubleshooting

-   **Ports**: Ensure ports 3000, 3001, 3100, 3200, and 9090 are not in use by other processes.
-   **Docker Logs**: Check service logs if something fails: `docker compose logs -f <service_name>`.
