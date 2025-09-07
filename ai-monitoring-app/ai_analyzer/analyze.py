import requests
from ollama import Client
from prometheus_client import Counter, generate_latest
from flask import Flask, Response

# Initialize Ollama client
client = Client()

PROMETHEUS_HOST = "http://prometheus:9090"
LOKI_HOST = "http://loki:3100"

# Prometheus metric for AI alerts
AI_ALERTS = Counter('ai_alerts', 'Number of AI-detected alerts')

# Flask app for exposing metrics
app = Flask(__name__)

def fetch_prometheus_metrics():
    try:
        response = requests.get(
            f"{PROMETHEUS_HOST}/api/v1/query",
            params={"query": "request_count"}
        )
        return response.json().get("data", {}).get("result", [])
    except Exception as e:
        print("Error fetching metrics:", e)
        return []

def fetch_loki_logs():
    try:
        response = requests.get(
            f"{LOKI_HOST}/loki/api/v1/query",
            params={"query": '{job="sample-app"}|~"error"', "limit": 50}
        )
        return response.json().get("data", {}).get("result", [])
    except Exception as e:
        print("Error fetching logs:", e)
        return []

def analyze_data():
    metrics = fetch_prometheus_metrics()
    logs = fetch_loki_logs()

    if not metrics and not logs:
        print("No data fetched! Check Docker containers and ports.")
        return

    prompt = f"""
You are a DevOps AI assistant. Analyze the following monitoring data:

Metrics: {metrics}
Logs: {logs}
"""

    try:
        response = client.chat(
            model="llama3",
            messages=[{"role": "user", "content": prompt}]
        )
        print("=== AI Analysis ===")
        print(response['message']['content'])
        # Increment AI alert metric if analysis finds issues
        if "issue" in response['message']['content'].lower():
            AI_ALERTS.inc()
    except Exception as e:
        print("Error analyzing data:", e)

@app.route('/')
def home():
    return "<h1>AI Monitoring Assistant</h1><p>Use /analyze to run AI insights</p>"

@app.route('/analyze')
def analyze():
    analyze_data()
    return "<p>AI analysis complete! Check terminal for details.</p>"

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
