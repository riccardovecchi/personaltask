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

# Data storage file
DATA_FILE = 'taskmanager_data.json'

# Initialize data structure
def init_data():
    return {
        'areas': [],
        'projects': [],
        'tasks': [],
        'notes': []
    }

# Load data from file
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return init_data()
    return init_data()

# Save data to file
def save_Perfetto! Ti fornisco tutti i file uno alla volta, pronti per essere copiati.

---

## **File 1: server.py**
