from flask import Flask, jsonify, request, send_from_directory
import json, os, random

app = Flask(__name__, static_folder='static')

with open(os.path.join(os.path.dirname(__file__), 'data', 'songs.json'), encoding='utf-8') as f:
    SONGS = json.load(f)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/songs')
def songs():
    syl = request.args.get('s', '').lower().strip()
    if not syl:
        return jsonify([])
    results = []
    for key, titles in SONGS.items():
        if key.startswith(syl) or syl.startswith(key):
            results.extend(titles)
    unique = list(dict.fromkeys(results))
    random.shuffle(unique)
    return jsonify(unique[:15])

if __name__ == '__main__':
    print("\n🎵  Antaakshri is running!")
    print("    Open your browser and go to: http://localhost:5000\n")
    app.run(debug=True, port=5000)
