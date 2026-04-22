#!/usr/bin/env python3
"""
Personal Task Manager Server
Hosts a local task management application on 0.0.0.0:5000
Accessible via local network or Tailscale
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__, static_folder='.')
CORS(app)

DATA_FILE = 'taskmanager_data.json'

def init_data():
    return {
        'areas': [],
        'projects': [],
        'tasks': [],
        'notes': []
    }

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return init_data()
    return init_data()

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/data', methods=['GET'])
def get_data():
    data = load_data()
    return jsonify(data)

@app.route('/api/areas', methods=['POST'])
def create_area():
    data = load_data()
    area = request.json
    area['id'] = str(uuid.uuid4())
    area['created_at'] = datetime.now().isoformat()
    data['areas'].append(area)
    save_data(data)
    return jsonify(area), 201

@app.route('/api/areas/<area_id>', methods=['PUT'])
def update_area(area_id):
    data = load_data()
    for area in data['areas']:
        if area['id'] == area_id:
            area.update(request.json)
            area['updated_at'] = datetime.now().isoformat()
            save_data(data)
            return jsonify(area)
    return jsonify({'error': 'Area not found'}), 404

@app.route('/api/areas/<area_id>', methods=['DELETE'])
def delete_area(area_id):
    data = load_data()
    data['areas'] = [a for a in data['areas'] if a['id'] != area_id]
    data['projects'] = [p for p in data['projects'] if p.get('area_id') != area_id]
    save_data(data)
    return '', 204

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = load_data()
    project = request.json
    project['id'] = str(uuid.uuid4())
    project['created_at'] = datetime.now().isoformat()
    data['projects'].append(project)
    save_data(data)
    return jsonify(project), 201

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    data = load_data()
    for project in data['projects']:
        if project['id'] == project_id:
            project.update(request.json)
            project['updated_at'] = datetime.now().isoformat()
            save_data(data)
            return jsonify(project)
    return jsonify({'error': 'Project not found'}), 404

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    data = load_data()
    data['projects'] = [p for p in data['projects'] if p['id'] != project_id]
    data['tasks'] = [t for t in data['tasks'] if t.get('project_id') != project_id]
    save_data(data)
    return '', 204

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = load_data()
    task = request.json
    task['id'] = str(uuid.uuid4())
    task['created_at'] = datetime.now().isoformat()
    task['completed'] = False
    data['tasks'].append(task)
    save_data(data)
    return jsonify(task), 201

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = load_data()
    for task in data['tasks']:
        if task['id'] == task_id:
            task.update(request.json)
            task['updated_at'] = datetime.now().isoformat()
            save_data(data)
            return jsonify(task)
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    data = load_data()
    data['tasks'] = [t for t in data['tasks'] if t['id'] != task_id]
    save_data(data)
    return '', 204

@app.route('/api/notes', methods=['POST'])
def create_note():
    data = load_data()
    note = request.json
    note['id'] = str(uuid.uuid4())
    note['created_at'] = datetime.now().isoformat()
    data['notes'].append(note)
    save_data(data)
    return jsonify(note), 201

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    data = load_data()
    for note in data['notes']:
        if note['id'] == note_id:
            note.update(request.json)
            note['updated_at'] = datetime.now().isoformat()
            save_data(data)
            return jsonify(note)
    return jsonify({'error': 'Note not found'}), 404

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    data = load_data()
    data['notes'] = [n for n in data['notes'] if n['id'] != note_id]
    save_data(data)
    return '', 204

if __name__ == '__main__':
    print("=" * 60)
    print("Personal Task Manager Server")
    print("=" * 60)
    print("Server starting on http://0.0.0.0:5000")
    print("Access locally: http://localhost:5000")
    print("Access on network: http://[your-local-ip]:5000")
    print("Access via Tailscale: http://[your-tailscale-ip]:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
