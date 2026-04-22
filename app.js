/**
 * Personal Task Manager - Main Application Logic
 * Handles all client-side interactions and API communication
 */

// ===== State Management =====
const state = {
    areas: [],
    projects: [],
    tasks: [],
    notes: [],
    currentAreaId: null
};

// ===== API Configuration =====
const API_BASE = window.location.origin;

// ===== API Functions =====
async function fetchData() {
    try {
        const response = await fetch(`${API_BASE}/api/data`);
        const data = await response.json();
        state.areas = data.areas || [];
        state.projects = data.projects || [];
        state.tasks = data.tasks || [];
        state.notes = data.notes || [];
        renderAreas();
        if (state.currentAreaId) {
            renderAreaContent(state.currentAreaId);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function createArea(areaData) {
    try {
        const response = await fetch(`${API_BASE}/api/areas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(areaData)
        });
        const area = await response.json();
        state.areas.push(area);
        renderAreas();
        selectArea(area.id);
        return area;
    } catch (error) {
        console.error('Error creating area:', error);
    }
}

async function updateArea(areaId, areaData) {
    try {
        const response = await fetch(`${API_BASE}/api/areas/${areaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(areaData)
        });
        const area = await response.json();
        const index = state.areas.findIndex(a => a.id === areaId);
        if (index !== -1) {
            state.areas[index] = area;
            renderAreas();
            renderAreaContent(areaId);
        }
        return area;
    } catch (error) {
        console.error('Error updating area:', error);
    }
}

async function deleteArea(areaId) {
    try {
        await fetch(`${API_BASE}/api/areas/${areaId}`, { method: 'DELETE' });
        state.areas = state.areas.filter(a => a.id !== areaId);
        state.projects = state.projects.filter(p => p.area_id !== areaId);
        state.currentAreaId = null;
        renderAreas();
        showEmptyState();
    } catch (error) {
        console.error('Error deleting area:', error);
    }
}

async function createProject(projectData) {
    try {
        const response = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const project = await response.json();
        state.projects.push(project);
        renderProjects();
        return project;
    } catch (error) {
        console.error('Error creating project:', error);
    }
}

async function updateProject(projectId, projectData) {
    try {
        const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const project = await response.json();
        const index = state.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            state.projects[index] = project;
            renderProjects();
        }
        return project;
    } catch (error) {
        console.error('Error updating project:', error);
    }
}

async function deleteProject(projectId) {
    try {
        await fetch(`${API_BASE}/api/projects/${projectId}`, { method: 'DELETE' });
        state.projects = state.projects.filter(p => p.id !== projectId);
        state.tasks = state.tasks.filter(t => t.project_id !== projectId);
        renderProjects();
        renderTasks();
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

async function createTask(taskData) {
    try {
        const response = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const task = await response.json();
        state.tasks.push(task);
        renderTasks();
        return task;
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const task = await response.json();
        const index = state.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            state.tasks[index] = task;
            renderTasks();
        }
        return task;
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(taskId) {
    try {
        await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE' });
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        renderTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function createNote(noteData) {
    try {
        const response = await fetch(`${API_BASE}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        const note = await response.json();
        state.notes.push(note);
        renderNotes();
        return note;
    } catch (error) {
        console.error('Error creating note:', error);
    }
}

async function updateNote(noteId, noteData) {
    try {
        const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        const note = await response.json();
        const index = state.notes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            state.notes[index] = note;
            renderNotes();
        }
        return note;
    } catch (error) {
        console.error('Error updating note:', error);
    }
}

async function deleteNote(noteId) {
    try {
        await fetch(`${API_BASE}/api/notes/${noteId}`, { method: 'DELETE' });
        state.notes = state.notes.filter(n => n.id !== noteId);
        renderNotes();
    } catch (error) {
        console.error('Error deleting note:', error);
    }
}

// ===== Render Functions =====
function renderAreas() {
    const areasList = document.getElementById('areasList');

    if (state.areas.length === 0) {
        areasList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                <p style="font-size: 13px;">Nessuna area creata</p>
            </div>
        `;
        return;
    }

    areasList.innerHTML = state.areas.map(area => {
        const projectCount = state.projects.filter(p => p.area_id === area.id).length;
        const taskCount = state.tasks.filter(t => t.area_id === area.id).length;
        const isActive = area.id === state.currentAreaId;

        return `
            <div class="area-item ${isActive ? 'active' : ''}" data-area-id="${area.id}">
                <div class="area-icon" style="background: ${area.color || '#6366f1'}33;">
                    ${area.icon || '📁'}
                </div>
                <div class="area-info">
                    <div class="area-name">${area.name}</div>
                    <div class="area-count">${projectCount} progetti · ${taskCount} task</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners
    document.querySelectorAll('.area-item').forEach(item => {
        item.addEventListener('click', () => {
            const areaId = item.dataset.areaId;
            selectArea(areaId);
        });
    });
}

function selectArea(areaId) {
    state.currentAreaId = areaId;
    renderAreas();
    renderAreaContent(areaId);
}

function renderAreaContent(areaId) {
    const area = state.areas.find(a => a.id === areaId);
    if (!area) return;

    // Update header
    document.getElementById('areaTitle').textContent = area.name;
    document.getElementById('areaDescription').textContent = area.description || '';
    document.getElementById('editAreaBtn').style.display = 'flex';
    document.getElementById('deleteAreaBtn').style.display = 'flex';

    // Show content grid, hide empty state
    document.getElementById('contentGrid').style.display = 'grid';
    document.getElementById('emptyState').style.display = 'none';

    // Render content
    renderProjects();
    renderTasks();
    renderNotes();
}

function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    const areaProjects = state.projects.filter(p => p.area_id === state.currentAreaId);

    if (areaProjects.length === 0) {
        projectsList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                <p style="font-size: 13px;">Nessun progetto</p>
            </div>
        `;
        return;
    }

    projectsList.innerHTML = areaProjects.map(project => {
        const projectTasks = state.tasks.filter(t => t.project_id === project.id);
        const completedTasks = projectTasks.filter(t => t.completed).length;

        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <div>
                        <div class="project-name">${project.name}</div>
                        ${project.description ? `<div class="project-description">${project.description}</div>` : ''}
                        ${projectTasks.length > 0 ? `
                            <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
                                ${completedTasks}/${projectTasks.length} task completati
                            </div>
                        ` : ''}
                    </div>
                    <div class="project-actions">
                        <button class="btn-icon edit-project" data-project-id="${project.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon delete-project" data-project-id="${project.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.edit-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const projectId = btn.dataset.projectId;
            showEditProjectModal(projectId);
        });
    });

    document.querySelectorAll('.delete-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const projectId = btn.dataset.projectId;
            if (confirm('Sei sicuro di voler eliminare questo progetto?')) {
                deleteProject(projectId);
            }
        });
    });
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const areaTasks = state.tasks.filter(t => t.area_id === state.currentAreaId);

    if (areaTasks.length === 0) {
        tasksList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                <p style="font-size: 13px;">Nessun task</p>
            </div>
        `;
        return;
    }

    // Sort: incomplete first, then by creation date
    areaTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    tasksList.innerHTML = areaTasks.map(task => {
        const project = state.projects.find(p => p.id === task.project_id);

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-task-id="${task.id}">
                    ${task.completed ? `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    ` : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${project ? `<div class="task-meta">📁 ${project.name}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-icon edit-task" data-task-id="${task.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete-task" data-task-id="${task.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation();
            const taskId = checkbox.dataset.taskId;
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                await updateTask(taskId, { completed: !task.completed });
            }
        });
    });

    document.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.taskId;
            showEditTaskModal(taskId);
        });
    });

    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.taskId;
            if (confirm('Sei sicuro di voler eliminare questo task?')) {
                deleteTask(taskId);
            }
        });
    });
}

function renderNotes() {
    const notesList = document.getElementById('notesList');
    const areaNotes = state.notes.filter(n => n.area_id === state.currentAreaId);

    if (areaNotes.length === 0) {
        notesList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                <p style="font-size: 13px;">Nessuna nota</p>
            </div>
        `;
        return;
    }

    notesList.innerHTML = areaNotes.map(note => {
        const project = state.projects.find(p => p.id === note.project_id);

        return `
            <div class="note-card" data-note-id="${note.id}">
                <div class="note-header">
                    <div class="note-title">${note.title}</div>
                    <div class="note-actions">
                        <button class="btn-icon edit-note" data-note-id="${note.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon delete-note" data-note-id="${note.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="note-content">${note.content}</div>
                ${project ? `<div class="note-meta">📁 ${project.name}</div>` : ''}
            </div>
        `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.edit-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = btn.dataset.noteId;
            showEditNoteModal(noteId);
        });
    });

    document.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = btn.dataset.noteId;
            if (confirm('Sei sicuro di voler eliminare questa nota?')) {
                deleteNote(noteId);
            }
        });
    });
}

function showEmptyState() {
    document.getElementById('contentGrid').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('areaTitle').textContent = 'Seleziona un\'area';
    document.getElementById('areaDescription').textContent = '';
    document.getElementById('editAreaBtn').style.display = 'none';
    document.getElementById('deleteAreaBtn').style.display = 'none';
}

// ===== Modal Functions =====
function showModal(title, content) {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    modal.classList.add('active');
}

function hideModal() {
    document.getElementById('modal').classList.remove('active');
}

function showAddAreaModal() {
    const content = `
        <form id="areaForm">
            <div class="form-group">
                <label class="form-label">Nome Area</label>
                <input type="text" class="form-input" id="areaName" required placeholder="es. Lavoro, Personale, Salute...">
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="areaDescription" placeholder="Descrizione opzionale..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Icona</label>
                <input type="text" class="form-input" id="areaIcon" placeholder="es. 💼, 🏠, 💪, 💰">
            </div>
            <div class="form-group">
                <label class="form-label">Colore</label>
                <input type="color" class="form-input" id="areaColor" value="#6366f1">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Crea Area</button>
            </div>
        </form>
    `;

    showModal('Nuova Area', content);

    document.getElementById('areaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const areaData = {
            name: document.getElementById('areaName').value,
            description: document.getElementById('areaDescription').value,
            icon: document.getElementById('areaIcon').value,
            color: document.getElementById('areaColor').value
        };
        await createArea(areaData);
        hideModal();
    });
}

function showEditAreaModal() {
    const area = state.areas.find(a => a.id === state.currentAreaId);
    if (!area) return;

    const content = `
        <form id="editAreaForm">
            <div class="form-group">
                <label class="form-label">Nome Area</label>
                <input type="text" class="form-input" id="editAreaName" value="${area.name}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="editAreaDescription">${area.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Icona</label>
                <input type="text" class="form-input" id="editAreaIcon" value="${area.icon || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Colore</label>
                <input type="color" class="form-input" id="editAreaColor" value="${area.color || '#6366f1'}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Modifiche</button>
            </div>
        </form>
    `;

    showModal('Modifica Area', content);

    document.getElementById('editAreaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const areaData = {
            name: document.getElementById('editAreaName').value,
            description: document.getElementById('editAreaDescription').value,
            icon: document.getElementById('editAreaIcon').value,
            color: document.getElementById('editAreaColor').value
        };
        await updateArea(state.currentAreaId, areaData);
        hideModal();
    });
}

function showAddProjectModal() {
    const content = `
        <form id="projectForm">
            <div class="form-group">
                <label class="form-label">Nome Progetto</label>
                <input type="text" class="form-input" id="projectName" required placeholder="es. Nuovo sito web">
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="projectDescription" placeholder="Descrizione opzionale..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Crea Progetto</button>
            </div>
        </form>
    `;

    showModal('Nuovo Progetto', content);

    document.getElementById('projectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            area_id: state.currentAreaId
        };
        await createProject(projectData);
        hideModal();
    });
}

function showEditProjectModal(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    const content = `
        <form id="editProjectForm">
            <div class="form-group">
                <label class="form-label">Nome Progetto</label>
                <input type="text" class="form-input" id="editProjectName" value="${project.name}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="editProjectDescription">${project.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Modifiche</button>
            </div>
        </form>
    `;

    showModal('Modifica Progetto', content);

    document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name: document.getElementById('editProjectName').value,
            description: document.getElementById('editProjectDescription').value
        };
        await updateProject(projectId, projectData);
        hideModal();
    });
}

function showAddTaskModal() {
    const areaProjects = state.projects.filter(p => p.area_id === state.currentAreaId);

    const content = `
        <form id="taskForm">
            <div class="form-group">
                <label class="form-label">Titolo Task</label>
                <input type="text" class="form-input" id="taskTitle" required placeholder="es. Completare il design">
            </div>
            <div class="form-group">
                <label class="form-label">Progetto (opzionale)</label>
                <select class="form-select" id="taskProject">
                    <option value="">Nessun progetto</option>
                    ${areaProjects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="taskDescription" placeholder="Descrizione opzionale..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Crea Task</button>
            </div>
        </form>
    `;

    showModal('Nuovo Task', content);

    document.getElementById('taskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            area_id: state.currentAreaId,
            project_id: document.getElementById('taskProject').value || null
        };
        await createTask(taskData);
        hideModal();
    });
}

function showEditTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const areaProjects = state.projects.filter(p => p.area_id === state.currentAreaId);

    const content = `
        <form id="editTaskForm">
            <div class="form-group">
                <label class="form-label">Titolo Task</label>
                <input type="text" class="form-input" id="editTaskTitle" value="${task.title}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Progetto (opzionale)</label>
                <select class="form-select" id="editTaskProject">
                    <option value="">Nessun progetto</option>
                    ${areaProjects.map(p => `
                        <option value="${p.id}" ${p.id === task.project_id ? 'selected' : ''}>
                            ${p.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Descrizione</label>
                <textarea class="form-textarea" id="editTaskDescription">${task.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Modifiche</button>
            </div>
        </form>
    `;

    showModal('Modifica Task', content);

    document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title: document.getElementById('editTaskTitle').value,
            description: document.getElementById('editTaskDescription').value,
            project_id: document.getElementById('editTaskProject').value || null
        };
        await updateTask(taskId, taskData);
        hideModal();
    });
}

function showAddNoteModal() {
    const areaProjects = state.projects.filter(p => p.area_id === state.currentAreaId);

    const content = `
        <form id="noteForm">
            <div class="form-group">
                <label class="form-label">Titolo Nota</label>
                <input type="text" class="form-input" id="noteTitle" required placeholder="es. Idee per il progetto">
            </div>
            <div class="form-group">
                <label class="form-label">Progetto (opzionale)</label>
                <select class="form-select" id="noteProject">
                    <option value="">Nessun progetto</option>
                    ${areaProjects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Contenuto</label>
                <textarea class="form-textarea" id="noteContent" required placeholder="Scrivi qui la tua nota..." style="min-height: 150px;"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Crea Nota</button>
            </div>
        </form>
    `;

    showModal('Nuova Nota', content);

    document.getElementById('noteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const noteData = {
            title: document.getElementById('noteTitle').value,
            content: document.getElementById('noteContent').value,
            area_id: state.currentAreaId,
            project_id: document.getElementById('noteProject').value || null
        };
        await createNote(noteData);
        hideModal();
    });
}

function showEditNoteModal(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;

    const areaProjects = state.projects.filter(p => p.area_id === state.currentAreaId);

    const content = `
        <form id="editNoteForm">
            <div class="form-group">
                <label class="form-label">Titolo Nota</label>
                <input type="text" class="form-input" id="editNoteTitle" value="${note.title}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Progetto (opzionale)</label>
                <select class="form-select" id="editNoteProject">
                    <option value="">Nessun progetto</option>
                    ${areaProjects.map(p => `
                        <option value="${p.id}" ${p.id === note.project_id ? 'selected' : ''}>
                            ${p.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Contenuto</label>
                <textarea class="form-textarea" id="editNoteContent" required style="min-height: 150px;">${note.content}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Modifiche</button>
            </div>
        </form>
    `;

    showModal('Modifica Nota', content);

    document.getElementById('editNoteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const noteData = {
            title: document.getElementById('editNoteTitle').value,
            content: document.getElementById('editNoteContent').value,
            project_id: document.getElementById('editNoteProject').value || null
        };
        await updateNote(noteId, noteData);
        hideModal();
    });
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    fetchData();

    // Add Area button
    document.getElementById('addAreaBtn').addEventListener('click', showAddAreaModal);

    // Edit Area button
    document.getElementById('editAreaBtn').addEventListener('click', showEditAreaModal);

    // Delete Area button
    document.getElementById('deleteAreaBtn').addEventListener('click', () => {
        if (confirm('Sei sicuro di voler eliminare questa area? Verranno eliminati anche tutti i progetti, task e note associati.')) {
            deleteArea(state.currentAreaId);
        }
    });

    // Add Project button
    document.getElementById('addProjectBtn').addEventListener('click', showAddProjectModal);

    // Add Task button
    document.getElementById('addTaskBtn').addEventListener('click', showAddTaskModal);

    // Add Note button
    document.getElementById('addNoteBtn').addEventListener('click', showAddNoteModal);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', hideModal);

    // Close modal on backdrop click
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') {
            hideModal();
        }
    });
});
