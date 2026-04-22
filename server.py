from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# File JSON per la persistenza dei dati
DATA_FILE = 'tasks.json'

# Inizializza il file JSON se non esiste
def init_data_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump({'tasks': []}, f, ensure_ascii=False, indent=2)

# Leggi i task dal file JSON
def read_tasks():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {'tasks': []}

# Scrivi i task nel file JSON
def write_tasks(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Serve i file statici (HTML, CSS, JS)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# API: Ottieni tutti i task
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    data = read_tasks()
    return jsonify(data['tasks'])

# API: Ottieni un task specifico
@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    data = read_tasks()
    task = next((t for t in data['tasks'] if t['id'] == task_id), None)
    if task:
        return jsonify(task)
    return jsonify({'error': 'Task non trovato'}), 404

# API: Crea un nuovo task
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = read_tasks()
    new_task = request.json

    # Genera un nuovo ID
    new_id = max([t['id'] for t in data['tasks']], default=0) + 1
    new_task['id'] = new_id
    new_task['created_at'] = datetime.now().isoformat()
    new_task['completed'] = False

    data['tasks'].append(new_task)
    write_tasks(data)

    return jsonify(new_task), 201

# API: Aggiorna un task esistente
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = read_tasks()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        updated_task = request.json
        updated_task['id'] = task_id
        updated_task['updated_at'] = datetime.now().isoformat()
        data['tasks'][task_index] = updated_task
        write_tasks(data)
        return jsonify(updated_task)

    return jsonify({'error': 'Task non trovato'}), 404

# API: Elimina un task
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    data = read_tasks()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        deleted_task = data['tasks'].pop(task_index)
        write_tasks(data)
        return jsonify({'message': 'Task eliminato', 'task': deleted_task})

    return jsonify({'error': 'Task non trovato'}), 404

# API: Toggle completamento task
@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    data = read_tasks()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        data['tasks'][task_index]['completed'] = not data['tasks'][task_index]['completed']
        data['tasks'][task_index]['updated_at'] = datetime.now().isoformat()
        write_tasks(data)
        return jsonify(data['tasks'][task_index])

    return jsonify({'error': 'Task non trovato'}), 404

if __name__ == '__main__':
    init_data_file()
    print("🚀 Task Manager avviato su http://localhost:5000")
    print("📝 I dati vengono salvati in tasks.json")
    app.run(debug=True, port=5000)
