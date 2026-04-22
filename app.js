// Configurazione API
const API_URL = 'http://localhost:5000/api';

// Stato dell'applicazione
let tasks = [];
let currentFilter = 'all';
let currentCategory = null;
let currentPriority = null;
let editingTaskId = null;

// Mappa colori categorie
const categoryColors = {
    'Lavoro': '#3b82f6',
    'Personale': '#8b5cf6',
    'Salute': '#10b981',
    'Finanze': '#f59e0b',
    'Casa': '#ec4899',
    'Hobby': '#06b6d4',
    'Studio': '#6366f1',
    'Sport': '#14b8a6',
    'Famiglia': '#f43f5e',
    'Progetti': '#a855f7',
    'Shopping': '#eab308',
    'Viaggi': '#0ea5e9'
};

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadTasks();
});

// Event Listeners
function initEventListeners() {
    // Nuovo task
    document.getElementById('btn-new-task').addEventListener('click', openNewTaskModal);

    // Chiudi modal
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);

    // Submit form
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Ricerca
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // Filtri
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn.dataset.filter));
    });

    // Categorie
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilter(btn.dataset.category));
    });

    // Priorità
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => handlePriorityFilter(btn.dataset.priority));
    });

    // Chiudi modal cliccando fuori
    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target.id === 'task-modal') closeModal();
    });
}

// API Calls
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        tasks = await response.json();
        renderTasks();
        updateCounts();
    } catch (error) {
        console.error('Errore nel caricamento dei task:', error);
        showError('Impossibile caricare i task. Assicurati che il server sia avviato.');
    }
}

async function createTask(taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const newTask = await response.json();
        tasks.push(newTask);
        renderTasks();
        updateCounts();
        closeModal();
    } catch (error) {
        console.error('Errore nella creazione del task:', error);
        showError('Impossibile creare il task.');
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const updatedTask = await response.json();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = updatedTask;
            renderTasks();
            updateCounts();
        }
        closeModal();
    } catch (error) {
        console.error('Errore nell\'aggiornamento del task:', error);
        showError('Impossibile aggiornare il task.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return;

    try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateCounts();
    } catch (error) {
        console.error('Errore nell\'eliminazione del task:', error);
        showError('Impossibile eliminare il task.');
    }
}

async function toggleTaskComplete(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/toggle`, {
            method: 'PATCH'
        });
        const updatedTask = await response.json();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = updatedTask;
            renderTasks();
            updateCounts();
        }
    } catch (error) {
        console.error('Errore nel toggle del task:', error);
        showError('Impossibile aggiornare lo stato del task.');
    }
}

// Rendering
function renderTasks() {
    const container = document.getElementById('tasks-container');
    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">Nessun task trovato</div>
                <div class="empty-state-subtext">Crea un nuovo task per iniziare</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');

    // Aggiungi event listeners ai task
    filteredTasks.forEach(task => {
        // Checkbox
        const checkbox = document.querySelector(`[data-task-id="${task.id}"] .task-checkbox`);
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(task.id);
        });

        // Edit
        const editBtn = document.querySelector(`[data-task-id="${task.id}"] .btn-edit`);
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTaskModal(task);
        });

        // Delete
        const deleteBtn = document.querySelector(`[data-task-id="${task.id}"] .btn-delete`);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
    });
}

function createTaskCard(task) {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && !task.completed;
    const dueDateText = dueDate ? formatDate(dueDate) : '';

    return `
        <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-category">
                            <span class="category-dot" style="background: ${categoryColors[task.category]};"></span>
                            ${task.category}
                        </span>
                        <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
                        ${dueDateText ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">📅 ${dueDateText}</span>` : ''}
                    </div>
                    ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ''}
                    <div class="task-actions">
                        <button class="btn-icon btn-edit">✏️ Modifica</button>
                        <button class="btn-icon btn-delete delete">🗑️ Elimina</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Filtri
function getFilteredTasks() {
    let filtered = [...tasks];

    // Filtro stato
    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Filtro categoria
    if (currentCategory) {
        filtered = filtered.filter(t => t.category === currentCategory);
    }

    // Filtro priorità
    if (currentPriority) {
        filtered = filtered.filter(t => t.priority === currentPriority);
    }

    // Ricerca
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(searchTerm) ||
            (t.notes && t.notes.toLowerCase().includes(searchTerm))
        );
    }

    // Ordina per data di creazione (più recenti prima)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
}

function handleFilterChange(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTasks();
}

function handleCategoryFilter(category) {
    currentCategory = currentCategory === category ? null : category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
    });
    renderTasks();
}

function handlePriorityFilter(priority) {
    currentPriority = currentPriority === priority ? null : priority;
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === currentPriority);
    });
    renderTasks();
}

function handleSearch() {
    renderTasks();
}

function updateCounts() {
    document.getElementById('count-all').textContent = tasks.length;
    document.getElementById('count-active').textContent = tasks.filter(t => !t.completed).length;
    document.getElementById('count-completed').textContent = tasks.filter(t => t.completed).length;
}

// Modal
function openNewTaskModal() {
    editingTaskId = null;
    document.getElementById('modal-title').textContent = 'Nuovo Task';
    document.getElementById('task-form').reset();
    document.getElementById('task-modal').classList.add('active');
}

function openEditTaskModal(task) {
    editingTaskId = task.id;
    document.getElementById('modal-title').textContent = 'Modifica Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
    document.getElementById('task-form').reset();
    editingTaskId = null;
}

function handleTaskSubmit(e) {
    e.preventDefault();

    const taskData = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        priority: document.getElementById('task-priority').value,
        due_date: document.getElementById('task-due-date').value || null,
        notes: document.getElementById('task-notes').value || null
    };

    if (editingTaskId) {
        taskData.completed = tasks.find(t => t.id === editingTaskId).completed;
        updateTask(editingTaskId, taskData);
    } else {
        createTask(taskData);
    }
}

// Utility
function formatDate(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Oggi';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Domani';
    } else {
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert(message); // In produzione, usa un sistema di notifiche più elegante
}
