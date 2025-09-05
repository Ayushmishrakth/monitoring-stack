from flask import Flask
from prometheus_client import Counter, generate_latest
from flask import Response

app = Flask(__name__)

# Example Prometheus metric
REQUEST_COUNT = Counter('request_count', 'Total number of requests')

@app.route('/')
def hello():
    REQUEST_COUNT.inc()
    return "Hello, Monitoring Stack!"

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')

if __name__ == "__main__":
    # Run Flask app on 0.0.0.0 so container exposes it
    app.run(host="0.0.0.0", port=80)
