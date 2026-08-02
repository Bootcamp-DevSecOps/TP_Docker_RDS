const express = require('express');
const cors = require('cors');
const pool = require('./src/db');
const tasksRouter = require('./src/routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route de sante : utile pour verifier que le conteneur backend
// arrive bien a joindre la base de donnees RDS.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('Health check DB error:', err.message);
    res.status(500).json({ status: 'error', db: 'unreachable', message: err.message });
  }
});

app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
  console.log(`Backend demarre sur le port ${PORT}`);
});
