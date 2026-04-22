from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import json
import os
from datetime import datetime
import shutil

app = Flask(__name__)
CORS(app)

# File JSON per la persistenza dei dati
DATA_FILE = 'data.json'
BACKUP_DIR = 'backups'

# Struttura dati iniziale
INITIAL_DATA = {
    'tasks': [],
    'projects': [],
    'notes': []
}

def init_data_file():
    """Inizializza il file dati se non esiste"""
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(INITIAL_DATA, f, ensure_ascii=False, indent=2)

    # Crea cartella backup
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

def read_data():
    """Leggi tutti i dati dal file JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Assicura che tutte le chiavi esistano
            for key in INITIAL_DATA:
                if key not in data:
                    data[key] = []
            return data
    except:
        return INITIAL_DATA.copy()

def write_data(data):
    """Scrivi i dati nel file JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def create_backup():
    """Crea un backup automatico"""
    if not os.path.exists(DATA_FILE):
        return None

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(BACKUP_DIR, f'backup_{timestamp}.json')
    shutil.copy2(DATA_FILE, backup_file)

    # Mantieni solo gli ultimi 10 backup
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.startswith('backup_')])
    if len(backups) > 10:
        for old_backup in backups[:-10]:
            os.remove(os.path.join(BACKUP_DIR, old_backup))

    return backup_file

# ============================================================================
# ROUTES - Serve file statici
# ============================================================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ============================================================================
# API - Health Check
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    data = read_data()
    return jsonify({
        'status': 'ok',
        'message': 'Task Manager API is running',
        'stats': {
            'tasks': len(data['tasks']),
            'projects': len(data['projects']),
            'notes': len(data['notes'])
        }
    })

# ============================================================================
# API - TASKS
# ============================================================================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    data = read_data()
    return jsonify(data['tasks'])

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    data = read_data()
    task = next((t for t in data['tasks'] if t['id'] == task_id), None)
    if task:
        return jsonify(task)
    return jsonify({'error': 'Task non trovato'}), 404

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = read_data()
    new_task = request.json

    # Genera nuovo ID
    new_id = max([t['id'] for t in data['tasks']], default=0) + 1
    new_task['id'] = new_id
    new_task['created_at'] = datetime.now().isoformat()
    new_task['updated_at'] = datetime.now().isoformat()
    new_task['completed'] = False

    data['tasks'].append(new_task)
    write_data(data)

    return jsonify(new_task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = read_data()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        updated_task = request.json
        updated_task['id'] = task_id
        updated_task['updated_at'] = datetime.now().isoformat()
        # Mantieni created_at originale
        updated_task['created_at'] = data['tasks'][task_index]['created_at']
        data['tasks'][task_index] = updated_task
        write_data(data)
        return jsonify(updated_task)

    return jsonify({'error': 'Task non trovato'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    data = read_data()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        deleted_task = data['tasks'].pop(task_index)
        write_data(data)
        return jsonify({'message': 'Task eliminato', 'task': deleted_task})

    return jsonify({'error': 'Task non trovato'}), 404

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    data = read_data()
    task_index = next((i for i, t in enumerate(data['tasks']) if t['id'] == task_id), None)

    if task_index is not None:
        data['tasks'][task_index]['completed'] = not data['tasks'][task_index]['completed']
        data['tasks'][task_index]['updated_at'] = datetime.now().isoformat()
        write_data(data)
        return jsonify(data['tasks'][task_index])

    return jsonify({'error': 'Task non trovato'}), 404

# ============================================================================
# API - PROJECTS
# ============================================================================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    data = read_data()
    return jsonify(data['projects'])

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    data = read_data()
    project = next((p for p in data['projects'] if p['id'] == project_id), None)
    if project:
        return jsonify(project)
    return jsonify({'error': 'Progetto non trovato'}), 404

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = read_data()
    new_project = request.json

    # Genera nuovo ID
    new_id = max([p['id'] for p in data['projects']], default=0) + 1
    new_project['id'] = new_id
    new_project['created_at'] = datetime.now().isoformat()
    new_project['updated_at'] = datetime.now().isoformat()

    data['projects'].append(new_project)
    write_data(data)

    return jsonify(new_project), 201

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    data = read_data()
    project_index = next((i for i, p in enumerate(data['projects']) if p['id'] == project_id), None)

    if project_index is not None:
        updated_project = request.json
        updated_project['id'] = project_id
        updated_project['updated_at'] = datetime.now().isoformat()
        updated_project['created_at'] = data['projects'][project_index]['created_at']
        data['projects'][project_index] = updated_project
        write_data(data)
        return jsonify(updated_project)

    return jsonify({'error': 'Progetto non trovato'}), 404

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    data = read_data()
    project_index = next((i for i, p in enumerate(data['projects']) if p['id'] == project_id), None)

    if project_index is not None:
        deleted_project = data['projects'].pop(project_index)
        write_data(data)
        return jsonify({'message': 'Progetto eliminato', 'project': deleted_project})

    return jsonify({'error': 'Progetto non trovato'}), 404

# ============================================================================
# API - NOTES
# ============================================================================

@app.route('/api/notes', methods=['GET'])
def get_notes():
    data = read_data()
    return jsonify(data['notes'])

@app.route('/api/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    data = read_data()
    note = next((n for n in data['notes'] if n['id'] == note_id), None)
    if note:
        return jsonify(note)
    return jsonify({'error': 'Nota non trovata'}), 404

@app.route('/api/notes', methods=['POST'])
def create_note():
    data = read_data()
    new_note = request.json

    # Genera nuovo ID
    new_id = max([n['id'] for n in data['notes']], default=0) + 1
    new_note['id'] = new_id
    new_note['created_at'] = datetime.now().isoformat()
    new_note['updated_at'] = datetime.now().isoformat()

    data['notes'].append(new_note)
    write_data(data)

    return jsonify(new_note), 201

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = read_data()
    note_index = next((i for i, n in enumerate(data['notes']) if n['id'] == note_id), None)

    if note_index is not None:
        updated_note = request.json
        updated_note['id'] = note_id
        updated_note['updated_at'] = datetime.now().isoformat()
        updated_note['created_at'] = data['notes'][note_index]['created_at']
        data['notes'][note_index] = updated_note
        write_data(data)
        return jsonify(updated_note)

    return jsonify({'error': 'Nota non trovata'}), 404

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    data = read_data()
    note_index = next((i for i, n in enumerate(data['notes']) if n['id'] == note_id), None)

    if note_index is not None:
        deleted_note = data['notes'].pop(note_index)
        write_data(data)
        return jsonify({'message': 'Nota eliminata', 'note': deleted_note})

    return jsonify({'error': 'Nota non trovata'}), 404

# ============================================================================
# API - BACKUP
# ============================================================================

@app.route('/api/backup', methods=['GET'])
def download_backup():
    """Scarica un backup completo dei dati"""
    try:
        backup_file = create_backup()
        if backup_file:
            return send_file(
                backup_file,
                as_attachment=True,
                download_name=f'task_manager_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
                mimetype='application/json'
            )
        else:
            return jsonify({'error': 'Nessun dato da salvare'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backup/restore', methods=['POST'])
def restore_backup():
    """Ripristina da un backup"""
    try:
        backup_data = request.json

        # Valida la struttura
        if not all(key in backup_data for key in ['tasks', 'projects', 'notes']):
            return jsonify({'error': 'Formato backup non valido'}), 400

        # Crea backup prima di sovrascrivere
        create_backup()

        # Ripristina i dati
        write_data(backup_data)

        return jsonify({'message': 'Backup ripristinato con successo'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export', methods=['GET'])
def export_data():
    """Esporta tutti i dati in formato JSON"""
    data = read_data()
    return jsonify(data)

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    init_data_file()

    print("\n" + "="*60)
    print("🚀 Task Manager Server Avviato")
    print("="*60)
    print(f"\n📍 Accesso:")
    print(f"   http://localhost:5000")
    print(f"   http://127.0.0.1:5000")
    print(f"\n📝 Dati salvati in: {os.path.abspath(DATA_FILE)}")
    print(f"💾 Backup salvati in: {os.path.abspath(BACKUP_DIR)}")
    print(f"\n✨ Funzionalità:")
    print(f"   • Task con priorità e scadenze")
    print(f"   • Progetti per organizzare i task")
    print(f"   • Note/Appunti collegabili")
    print(f"   • Backup automatico scaricabile")
    print("="*60 + "\n")

    app.run(debug=True, port=5000, host='127.0.0.1')
