# ai_analyzer/analyze.py
import requests
from ollama import Client

# Initialize Ollama client (no base_url)
client = Client()

# Use Docker container names for inter-container communication
PROMETHEUS_HOST = "http://prometheus:9090"
LOKI_HOST = "http://loki:3100"

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
            params={"query": '{job="docker-logs"}|~"error"', "limit": 50}
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
    except Exception as e:
        print("Error analyzing data:", e)

if __name__ == "__main__":
    analyze_data()
