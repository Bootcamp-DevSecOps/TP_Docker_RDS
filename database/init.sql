-- Script d'initialisation de la base de donnees "taskmanager"
-- A executer UNE FOIS sur l'instance RDS (via psql, un client SQL, ou un job d'init)
--
-- Exemple d'execution depuis une machine ayant acces au RDS :
--   psql "host=<endpoint-rds> port=5432 user=<user> dbname=taskmanager sslmode=require" -f init.sql

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Quelques donnees de demonstration
INSERT INTO tasks (title, done) VALUES
    ('Provisionner l''instance RDS', TRUE),
    ('Ecrire le Dockerfile du backend', FALSE),
    ('Ecrire le Dockerfile du frontend', FALSE),
    ('Configurer nginx en reverse proxy', FALSE),
    ('Pousser les images sur Docker Hub puis ECR', FALSE)
ON CONFLICT DO NOTHING;
