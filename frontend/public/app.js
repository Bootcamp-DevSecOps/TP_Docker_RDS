// IMPORTANT: on utilise un chemin RELATIF "/api/tasks".
// C'est le reverse proxy nginx qui devra rediriger "/api/*" vers le
// conteneur backend. Le frontend ne doit jamais connaitre l'adresse
// interne du backend.
const API_URL = '/api/tasks';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const status = document.getElementById('status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#f87171' : '#94a3b8';
}

async function fetchTasks() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tasks = await res.json();
    renderTasks(tasks);
    setStatus(`${tasks.length} tâche(s) chargée(s) depuis l'API.`);
  } catch (err) {
    setStatus(`Impossible de contacter l'API (${err.message}). Vérifiez le reverse proxy / backend.`, true);
  }
}

function renderTasks(tasks) {
  list.innerHTML = '';
  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = task.done ? 'done' : '';

    const span = document.createElement('span');
    span.textContent = task.title;
    span.addEventListener('click', () => toggleTask(task));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Supprimer';
    delBtn.className = 'delete';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

async function createTask(title) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function toggleTask(task) {
  await fetch(`${API_URL}/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: !task.done }),
  });
  fetchTasks();
}

async function deleteTask(id) {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  fetchTasks();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  try {
    await createTask(title);
    input.value = '';
    fetchTasks();
  } catch (err) {
    setStatus(`Erreur lors de l'ajout: ${err.message}`, true);
  }
});

fetchTasks();
