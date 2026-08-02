const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/tasks - liste toutes les taches
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, done, created_at FROM tasks ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la lecture des taches' });
  }
});

// POST /api/tasks - cree une nouvelle tache
router.post('/', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Le champ "title" est requis' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la creation de la tache' });
  }
});

// PUT /api/tasks/:id - met a jour une tache (ex: cochee/decochee)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           done = COALESCE($2, done)
       WHERE id = $3
       RETURNING id, title, done, created_at`,
      [title, done, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tache introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la mise a jour' });
  }
});

// DELETE /api/tasks/:id - supprime une tache
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tache introuvable' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

module.exports = router;
