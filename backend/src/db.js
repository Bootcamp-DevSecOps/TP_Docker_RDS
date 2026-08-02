const { Pool } = require('pg');

// Toutes les valeurs sont lues depuis les variables d'environnement.
// En production, ces variables pointeront vers l'instance RDS.
// Ce sont les etudiants qui devront injecter ces variables
// (via docker-compose.yml, un fichier .env, ou les parametres ECS/EC2).
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool PostgreSQL', err);
});

module.exports = pool;
