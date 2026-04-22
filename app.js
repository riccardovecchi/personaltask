// ============================================================================
// CONFIGURAZIONE
// ============================================================================

// Configurazione automatica dell'API URL
const API_URL = (() => {
    const hostname = window.location.hostname;
    const port = 5000;

    console.log('🌐 Hostname rilevato:', hostname);

    // Accesso locale (sul Mac stesso)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('📍 Modalità: Locale');
        return `http://localhost:${port}/api`;
    }

    // Accesso via IP Tailscale o altro IP
    console.log('🔒 Modalità: Remoto');
    return `http://${hostname}:${port}/api`;
})();

console.log('🔧 API URL configurato:', API_URL);

// Stato dell'applicazione
let state = {
    tasks: [],
    projects: [],
    notes: [],
    currentView: 'tasks',
    currentFilter: 'all',
    currentCategory: null,
    currentPriority: null,
    editingId: null,
    editingType: null
};

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

// Traduzioni status progetti
const projectStatusLabels = {
    'planning': 'In Pianificazione',
    'active': 'Attivo',
    'paused': 'In Pausa',
    'completed': 'Completato'
};

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadAllData();
});

function initEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // Nuovo item
    document.getElementById('btn-new-item').addEventListener('click', openNewItemModal);

    // Backup
    document.getElementById('btn-backup').addEventListener('click', downloadBackup);

    // Ricerca
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // Filtri task
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

    // Modal Task
    document.getElementById('btn-close-task-modal').addEventListener('click', () => closeModal('task'));
    document.getElementById('btn-cancel-task').addEventListener('click', () => closeModal('task'));
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Modal Project
    document.getElementById('btn-close-project-modal').addEventListener('click', () => closeModal('project'));
    document.getElementById('btn-cancel-project').addEventListener('click', () => closeModal('project'));
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);

    // Modal Note
    document.getElementById('btn-close-note-modal').addEventListener('click', () => closeModal('note'));
    document.getElementById('btn-cancel-note').addEventListener('click', () => closeModal('note'));
    document.getElementById('note-form').addEventListener('submit', handleNoteSubmit);

    // Chiudi modal cliccando fuori
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id.replace('-modal', ''));
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileOverlay.classList.toggle('active');

            // Cambia icona
            mobileMenuToggle.textContent = sidebar.classList.contains('active') ? '✕' : '☰';
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            mobileOverlay.classList.remove('active');
            mobileMenuToggle.textContent = '☰';
        });

        // Chiudi menu quando si seleziona una categoria/filtro
        document.querySelectorAll('.filter-btn, .category-btn, .priority-btn, .nav-tab').forEach(btn => {
            const originalClickHandler = btn.onclick;
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                    mobileMenuToggle.textContent = '☰';
                }
            });
        });
    }
}

// ============================================================================
// GESTIONE VISTE
// ============================================================================

function switchView(view) {
    state.currentView = view;

    // Aggiorna tab attivi
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === view);
    });

    // Aggiorna viste contenuto
    document.querySelectorAll('.content-view').forEach(contentView => {
        contentView.classList.toggle('active', contentView.id === `view-${view}`);
    });

    // Aggiorna testo pulsante nuovo
    const btnNewText = document.getElementById('btn-new-text');
    const viewTexts = {
        'tasks': 'Nuovo Task',
        'projects': 'Nuovo Progetto',
        'notes': 'Nuova Nota'
    };
    btnNewText.textContent = viewTexts[view];

    // Mostra/nascondi filtri specifici
    const filtersTask = document.getElementById('filters-tasks');
    const filtersPriority = document.getElementById('filters-priority');

    if (view === 'tasks') {
        filtersTask.style.display = 'flex';
        filtersPriority.style.display = 'flex';
    } else {
        filtersTask.style.display = 'none';
        filtersPriority.style.display = 'none';
    }

    // Aggiorna placeholder ricerca
    const searchInput = document.getElementById('search-input');
    const placeholders = {
        'tasks': 'Cerca task...',
        'projects': 'Cerca progetti...',
        'notes': 'Cerca note...'
    };
    searchInput.placeholder = placeholders[view];
    searchInput.value = '';

    // Renderizza vista corrente
    renderCurrentView();
}

function renderCurrentView() {
    switch (state.currentView) {
        case 'tasks':
            renderTasks();
            break;
        case 'projects':
            renderProjects();
            break;
        case 'notes':
            renderNotes();
            break;
    }
}

// ============================================================================
// API CALLS
// ============================================================================

async function loadAllData() {
    try {
        const [tasks, projects, notes] = await Promise.all([
            fetch(`${API_URL}/tasks`).then(r => r.json()),
            fetch(`${API_URL}/projects`).then(r => r.json()),
            fetch(`${API_URL}/notes`).then(r => r.json())
        ]);

        state.tasks = tasks;
        state.projects = projects;
        state.notes = notes;

        renderCurrentView();
        updateCounts();
        updateProjectSelects();
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        showError('Impossibile caricare i dati. Assicurati che il server sia avviato.');
    }
}

// TASKS
async function createTask(taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const newTask = await response.json();
        state.tasks.push(newTask);
        renderTasks();
        updateCounts();
        closeModal('task');
        showSuccess('Task creato con successo!');
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
        const index = state.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            state.tasks[index] = updatedTask;
            renderTasks();
            updateCounts();
        }
        closeModal('task');
        showSuccess('Task aggiornato!');
    } catch (error) {
        console.error('Errore nell\'aggiornamento del task:', error);
        showError('Impossibile aggiornare il task.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return;

    try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateCounts();
        showSuccess('Task eliminato!');
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
        const index = state.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            state.tasks[index] = updatedTask;
            renderTasks();
            updateCounts();
        }
    } catch (error) {
        console.error('Errore nel toggle del task:', error);
        showError('Impossibile aggiornare lo stato del task.');
    }
}

// PROJECTS
async function createProject(projectData) {
    try {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const newProject = await response.json();
        state.projects.push(newProject);
        renderProjects();
        updateProjectSelects();
        closeModal('project');
        showSuccess('Progetto creato con successo!');
    } catch (error) {
        console.error('Errore nella creazione del progetto:', error);
        showError('Impossibile creare il progetto.');
    }
}

async function updateProject(projectId, projectData) {
    try {
        const response = await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const updatedProject = await response.json();
        const index = state.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            state.projects[index] = updatedProject;
            renderProjects();
            updateProjectSelects();
        }
        closeModal('project');
        showSuccess('Progetto aggiornato!');
    } catch (error) {
        console.error('Errore nell\'aggiornamento del progetto:', error);
        showError('Impossibile aggiornare il progetto.');
    }
}

async function deleteProject(projectId) {
    if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;

    try {
        await fetch(`${API_URL}/projects/${projectId}`, { method: 'DELETE' });
        state.projects = state.projects.filter(p => p.id !== projectId);
        renderProjects();
        updateProjectSelects();
        showSuccess('Progetto eliminato!');
    } catch (error) {
        console.error('Errore nell\'eliminazione del progetto:', error);
        showError('Impossibile eliminare il progetto.');
    }
}

// NOTES
async function createNote(noteData) {
    try {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        const newNote = await response.json();
        state.notes.push(newNote);
        renderNotes();
        closeModal('note');
        showSuccess('Nota creata con successo!');
    } catch (error) {
        console.error('Errore nella creazione della nota:', error);
        showError('Impossibile creare la nota.');
    }
}

async function updateNote(noteId, noteData) {
    try {
        const response = await fetch(`${API_URL}/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        const updatedNote = await response.json();
        const index = state.notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            state.notes[index] = updatedNote;
            renderNotes();
        }
        closeModal('note');
        showSuccess('Nota aggiornata!');
    } catch (error) {
        console.error('Errore nell\'aggiornamento della nota:', error);
        showError('Impossibile aggiornare la nota.');
    }
}

async function deleteNote(noteId) {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return;

    try {
        await fetch(`${API_URL}/notes/${noteId}`, { method: 'DELETE' });
        state.notes = state.notes.filter(n => n.id !== noteId);
        renderNotes();
        showSuccess('Nota eliminata!');
    } catch (error) {
        console.error('Errore nell\'eliminazione della nota:', error);
        showError('Impossibile eliminare la nota.');
    }
}

// BACKUP
async function downloadBackup() {
    try {
        const response = await fetch(`${API_URL}/backup`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Backup scaricato con successo!');
    } catch (error) {
        console.error('Errore nel download del backup:', error);
        showError('Impossibile scaricare il backup.');
    }
}

// ============================================================================
// RENDERING TASKS
// ============================================================================

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

    // Aggiungi event listeners
    filteredTasks.forEach(task => {
        const card = document.querySelector(`[data-task-id="${task.id}"]`);

        // Checkbox
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(task.id);
        });

        // Edit
        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTaskModal(task);
        });

        // Delete
        const deleteBtn = card.querySelector('.btn-delete');
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

    const project = task.project_id ? state.projects.find(p => p.id === task.project_id) : null;

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
                        ${project ? `<span class="task-project-badge">📁 ${escapeHtml(project.name)}</span>` : ''}
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

function getFilteredTasks() {
    let filtered = [...state.tasks];

    // Filtro stato
    if (state.currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (state.currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Filtro categoria
    if (state.currentCategory) {
        filtered = filtered.filter(t => t.category === state.currentCategory);
    }

    // Filtro priorità
    if (state.currentPriority) {
        filtered = filtered.filter(t => t.priority === state.currentPriority);
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

// ============================================================================
// RENDERING PROJECTS
// ============================================================================

function renderProjects() {
    const container = document.getElementById('projects-container');
    const filteredProjects = getFilteredProjects();

    if (filteredProjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div class="empty-state-text">Nessun progetto trovato</div>
                <div class="empty-state-subtext">Crea un nuovo progetto per organizzare i tuoi task</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredProjects.map(project => createProjectCard(project)).join('');

    // Aggiungi event listeners
    filteredProjects.forEach(project => {
        const card = document.querySelector(`[data-project-id="${project.id}"]`);

        // Edit
        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditProjectModal(project);
        });

        // Delete
        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(project.id);
        });
    });
}

function createProjectCard(project) {
    const tasksInProject = state.tasks.filter(t => t.project_id === project.id);
    const completedTasks = tasksInProject.filter(t => t.completed).length;
    const totalTasks = tasksInProject.length;

    const startDate = project.start_date ? formatDate(new Date(project.start_date)) : null;
    const endDate = project.end_date ? formatDate(new Date(project.end_date)) : null;

    return `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-header">
                <div class="project-content">
                    <div class="project-name">${escapeHtml(project.name)}</div>
                    <div class="project-meta">
                        <span class="project-category">
                            <span class="category-dot" style="background: ${categoryColors[project.category]};"></span>
                            ${project.category}
                        </span>
                        <span class="project-status ${project.status}">${projectStatusLabels[project.status]}</span>
                        ${totalTasks > 0 ? `<span class="task-project-badge">✓ ${completedTasks}/${totalTasks} task</span>` : ''}
                    </div>
                    ${project.description ? `<div class="project-description">${escapeHtml(project.description)}</div>` : ''}
                    ${startDate || endDate ? `
                        <div class="project-dates">
                            ${startDate ? `📅 Inizio: ${startDate}` : ''}
                            ${startDate && endDate ? ' • ' : ''}
                            ${endDate ? `🏁 Fine: ${endDate}` : ''}
                        </div>
                    ` : ''}
                    <div class="project-actions">
                        <button class="btn-icon btn-edit">✏️ Modifica</button>
                        <button class="btn-icon btn-delete delete">🗑️ Elimina</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getFilteredProjects() {
    let filtered = [...state.projects];

    // Filtro categoria
    if (state.currentCategory) {
        filtered = filtered.filter(p => p.category === state.currentCategory);
    }

    // Ricerca
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }

    // Ordina per data di creazione (più recenti prima)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
}

// ============================================================================
// RENDERING NOTES
// ============================================================================

function renderNotes() {
    const container = document.getElementById('notes-container');
    const filteredNotes = getFilteredNotes();

    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">Nessuna nota trovata</div>
                <div class="empty-state-subtext">Crea una nuova nota per salvare i tuoi appunti</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredNotes.map(note => createNoteCard(note)).join('');

    // Aggiungi event listeners
    filteredNotes.forEach(note => {
        const card = document.querySelector(`[data-note-id="${note.id}"]`);

        // Edit
        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditNoteModal(note);
        });

        // Delete
        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
    });
}

function createNoteCard(note) {
    const project = note.project_id ? state.projects.find(p => p.id === note.project_id) : null;
    const preview = note.content.length > 200 ? note.content.substring(0, 200) + '...' : note.content;

    return `
        <div class="note-card" data-note-id="${note.id}">
            <div class="note-header">
                <div class="note-content">
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    <div class="note-meta">
                        ${note.category ? `
                            <span class="note-category">
                                <span class="category-dot" style="background: ${categoryColors[note.category]};"></span>
                                ${note.category}
                            </span>
                        ` : ''}
                        ${project ? `<span class="note-project-badge">📁 ${escapeHtml(project.name)}</span>` : ''}
                        <span class="task-due-date">📅 ${formatDate(new Date(note.created_at))}</span>
                    </div>
                    <div class="note-preview">${escapeHtml(preview)}</div>
                    <div class="note-actions">
                        <button class="btn-icon btn-edit">✏️ Modifica</button>
                        <button class="btn-icon btn-delete delete">🗑️ Elimina</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getFilteredNotes() {
    let filtered = [...state.notes];

    // Filtro categoria
    if (state.currentCategory) {
        filtered = filtered.filter(n => n.category === state.currentCategory);
    }

    // Ricerca
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(n =>
            n.title.toLowerCase().includes(searchTerm) ||
            n.content.toLowerCase().includes(searchTerm)
        );
    }

    // Ordina per data di aggiornamento (più recenti prima)
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return filtered;
}

// ============================================================================
// FILTRI
// ============================================================================

function handleFilterChange(filter) {
    state.currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTasks();
}

function handleCategoryFilter(category) {
    state.currentCategory = state.currentCategory === category ? null : category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === state.currentCategory);
    });
    renderCurrentView();
}

function handlePriorityFilter(priority) {
    state.currentPriority = state.currentPriority === priority ? null : priority;
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.priority === state.currentPriority);
    });
    renderTasks();
}

function handleSearch() {
    renderCurrentView();
}

function updateCounts() {
    document.getElementById('count-all').textContent = state.tasks.length;
    document.getElementById('count-active').textContent = state.tasks.filter(t => !t.completed).length;
    document.getElementById('count-completed').textContent = state.tasks.filter(t => t.completed).length;
}

// ============================================================================
// MODALS
// ============================================================================

function openNewItemModal() {
    const modalMap = {
        'tasks': 'task',
        'projects': 'project',
        'notes': 'note'
    };
    const modalType = modalMap[state.currentView];

    state.editingId = null;
    state.editingType = modalType;

    const titleMap = {
        'task': 'Nuovo Task',
        'project': 'Nuovo Progetto',
        'note': 'Nuova Nota'
    };

    document.getElementById(`${modalType}-modal-title`).textContent = titleMap[modalType];
    document.getElementById(`${modalType}-form`).reset();
    document.getElementById(`${modalType}-modal`).classList.add('active');
}

function openEditTaskModal(task) {
    state.editingId = task.id;
    state.editingType = 'task';

    document.getElementById('task-modal-title').textContent = 'Modifica Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-project').value = task.project_id || '';
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-modal').classList.add('active');
}

function openEditProjectModal(project) {
    state.editingId = project.id;
    state.editingType = 'project';

    document.getElementById('project-modal-title').textContent = 'Modifica Progetto';
    document.getElementById('project-name').value = project.name;
    document.getElementById('project-category').value = project.category;
    document.getElementById('project-status').value = project.status;
    document.getElementById('project-description').value = project.description || '';
    document.getElementById('project-start-date').value = project.start_date || '';
    document.getElementById('project-end-date').value = project.end_date || '';
    document.getElementById('project-modal').classList.add('active');
}

function openEditNoteModal(note) {
    state.editingId = note.id;
    state.editingType = 'note';

    document.getElementById('note-modal-title').textContent = 'Modifica Nota';
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-category').value = note.category || '';
    document.getElementById('note-project').value = note.project_id || '';
    document.getElementById('note-content').value = note.content;
    document.getElementById('note-modal').classList.add('active');
}

function closeModal(type) {
    document.getElementById(`${type}-modal`).classList.remove('active');
    document.getElementById(`${type}-form`).reset();
    state.editingId = null;
    state.editingType = null;
}

// ============================================================================
// FORM HANDLERS
// ============================================================================

function handleTaskSubmit(e) {
    e.preventDefault();

    const projectId = document.getElementById('task-project').value;

    const taskData = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        priority: document.getElementById('task-priority').value,
        project_id: projectId ? parseInt(projectId) : null,
        due_date: document.getElementById('task-due-date').value || null,
        notes: document.getElementById('task-notes').value || null
    };

    if (state.editingId) {
        const task = state.tasks.find(t => t.id === state.editingId);
        taskData.completed = task.completed;
        updateTask(state.editingId, taskData);
    } else {
        createTask(taskData);
    }
}

function handleProjectSubmit(e) {
    e.preventDefault();

    const projectData = {
        name: document.getElementById('project-name').value,
        category: document.getElementById('project-category').value,
        status: document.getElementById('project-status').value,
        description: document.getElementById('project-description').value || null,
        start_date: document.getElementById('project-start-date').value || null,
        end_date: document.getElementById('project-end-date').value || null
    };

    if (state.editingId) {
        updateProject(state.editingId, projectData);
    } else {
        createProject(projectData);
    }
}

function handleNoteSubmit(e) {
    e.preventDefault();

    const projectId = document.getElementById('note-project').value;

    const noteData = {
        title: document.getElementById('note-title').value,
        category: document.getElementById('note-category').value || null,
        project_id: projectId ? parseInt(projectId) : null,
        content: document.getElementById('note-content').value
    };

    if (state.editingId) {
        updateNote(state.editingId, noteData);
    } else {
        createNote(noteData);
    }
}

// ============================================================================
// UTILITY
// ============================================================================

function updateProjectSelects() {
    const taskProjectSelect = document.getElementById('task-project');
    const noteProjectSelect = document.getElementById('note-project');

    const projectOptions = state.projects
        .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join('');

    taskProjectSelect.innerHTML = '<option value="">Nessun progetto</option>' + projectOptions;
    noteProjectSelect.innerHTML = '<option value="">Nessun progetto</option>' + projectOptions;
}

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
    alert('❌ ' + message);
}

function showSuccess(message) {
    // Crea notifica temporanea
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = '✓ ' + message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Aggiungi animazioni CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
