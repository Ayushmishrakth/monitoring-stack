from flask import Flask
from ai_analyzer.analyze import analyze_data

app = Flask(__name__)

@app.route('/')
def home():
    return "<h1>AI Monitoring Assistant</h1><p>Use /analyze to get AI insights</p>"

@app.route('/analyze')
def analyze():
    analyze_data()  # Prints AI summary in terminal
    return "<p>AI analysis complete! Check terminal for details.</p>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
