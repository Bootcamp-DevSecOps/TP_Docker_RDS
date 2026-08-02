# Projet DevOps – Gestionnaire de tâches (Task Manager)

## 1. Contexte

Ce dépôt contient une application **déjà développée** (frontend + backend), comme cela
serait livré par une équipe de développement en entreprise. Votre rôle n'est **pas**
de modifier le code applicatif, mais d'assurer la partie **DevOps / Infrastructure** :

- Conteneuriser l'application (Dockerfiles)
- Orchestrer les conteneurs (docker-compose)
- Mettre en place un reverse proxy (nginx)
- Gérer les images sur un registre (Docker Hub **puis** Amazon ECR)
- Déployer l'ensemble sur une instance **EC2**
- Utiliser une base de données managée **Amazon RDS** (PostgreSQL)

L'application est un gestionnaire de tâches simple (todo-list) :

- **Frontend** : HTML/CSS/JS statique (aucun build nécessaire)
- **Backend** : API REST en Node.js/Express (`/api/tasks`)
- **Base de données** : PostgreSQL (hébergée sur RDS, PAS en conteneur en production)

## 2. Architecture cible à mettre en place

```
                        Internet
                           │
                           ▼
                 ┌───────────────────┐
                 │   nginx (proxy)   │   <- conteneur, port 80/443 exposé sur l'EC2
                 └─────────┬─────────┘
                  /         │  \
                 /          │   \
        "/"  ───┘       "/api" ─┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│ conteneur        │  │ conteneur         │
│ frontend (HTML)  │  │ backend (Node.js) │
└─────────────────┘  └─────────┬────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │   Amazon RDS         │
                     │   (PostgreSQL)       │
                     │   hors Docker        │
                     └─────────────────────┘
```

Trois conteneurs applicatifs (frontend, backend, nginx) tournent sur **une seule
instance EC2**, pilotés par **docker-compose**. La base de données, elle, **ne tourne
pas dans un conteneur** : c'est une instance **RDS** séparée, dans le même VPC.

## 3. Contenu fourni dans ce dépôt

```
.
├── README.md               <- ce fichier (à lire en entier avant de commencer)
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── db.js            <- connexion PostgreSQL (via variables d'env)
│   │   └── routes/tasks.js
│   ├── package.json
│   └── .env.example         <- variables d'environnement attendues
├── frontend/
│   └── public/
│       ├── index.html
│       ├── style.css
│       └── app.js            <- appelle l'API via le chemin relatif /api/tasks
└── database/
    └── init.sql              <- script SQL à exécuter une fois sur RDS
```

**Vous ne trouverez volontairement aucun `Dockerfile`, `docker-compose.yml`, ni
configuration nginx dans ce dépôt.** C'est précisément votre travail de les écrire.

## 4. Ce que vous devez livrer

À la racine du dépôt (ou dans un dossier `infra/` clairement identifié), vous devez
ajouter :

1. `backend/Dockerfile`
2. `frontend/Dockerfile`
3. `nginx/Dockerfile` **ou** `nginx/nginx.conf` (selon votre approche : image nginx
   officielle + fichier de conf monté, ou image custom)
4. `docker-compose.yml` (à la racine) orchestrant les 3 services (`frontend`,
   `backend`, `nginx`)
5. Un fichier `.env` (ou équivalent) **non commité**, avec un `.env.example` mis à jour
   si besoin
6. Un document `DEPLOIEMENT.md` expliquant, étape par étape, comment vous avez :
   - créé l'instance RDS (moteur, version, taille, sous-réseaux, groupes de sécurité)
   - créé et sécurisé l'instance EC2
   - construit et poussé les images sur Docker Hub puis sur ECR
   - déployé sur EC2
   - configuré le reverse proxy

## 5. Étapes attendues

### Étape 0 – Prise en main du code
- Lisez `backend/server.js`, `backend/src/routes/tasks.js` et `frontend/public/app.js`.
- Le frontend appelle **toujours** `/api/tasks` en relatif : le reverse proxy doit
  donc rediriger `/api/*` vers le backend, et `/` vers le frontend.
- Le backend lit sa configuration BD via les variables d'environnement suivantes
  (voir `backend/.env.example`) :
  - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSL`
- Une route `GET /api/health` permet de vérifier que le backend arrive à joindre
  la base de données (très utile pour débugger la connexion RDS).

### Étape 1 – Provisionner la base de données RDS
- Créez une instance **RDS PostgreSQL** (version 15 ou 16 conseillée).
- Choisissez une instance de type gratuit/petit (ex : `db.t3.micro`) suffisante
  pour ce TP.
- Configurez un **groupe de sécurité RDS** qui n'autorise les connexions sur le
  port `5432` **que depuis le groupe de sécurité de votre instance EC2** (jamais
  depuis `0.0.0.0/0`).
- Une fois l'instance disponible, exécutez le script `database/init.sql` pour
  créer la table `tasks` (depuis votre poste, un bastion, ou l'EC2 elle-même).
- Notez l'**endpoint** RDS : il servira de valeur pour `PGHOST`.

### Étape 2 – Écrire les Dockerfiles
- **Backend** : image Node.js, installation des dépendances (`npm install
  --omit=dev`), copie du code, exposition du port `3000`, commande de démarrage
  `node server.js`. Réfléchissez à l'usage d'une image `alpine` pour alléger le
  build, et à un `.dockerignore` (`node_modules`, `.env`, etc.).
- **Frontend** : ce dossier ne contient que du HTML/CSS/JS statique. Une image
  `nginx:alpine` (ou équivalente) qui copie simplement `frontend/public/` dans
  le dossier servi (`/usr/share/nginx/html`) est suffisante.
- Testez chaque image individuellement (`docker build`, `docker run`) avant de
  passer à l'orchestration.

### Étape 3 – Écrire le docker-compose.yml
- Trois services : `frontend`, `backend`, `nginx` (ce dernier étant le reverse
  proxy, seul service à exposer un port vers l'extérieur).
- Le backend doit recevoir ses variables d'environnement de connexion à RDS
  (directement dans le compose, via un fichier `.env`, ou via des secrets
  Docker — à vous de choisir et de justifier).
- `nginx` doit dépendre de `frontend` et `backend` (`depends_on`).
- Utilisez un réseau Docker dédié (`networks:`) pour que les services
  communiquent entre eux par leur nom de service.

### Étape 4 – Configurer nginx comme reverse proxy
- `nginx` doit écouter sur le port `80` (et idéalement `443` si vous ajoutez du
  TLS en bonus) et exposer ce port sur l'hôte EC2.
- Règles de routage attendues :
  - `location /api/ { proxy_pass vers le service backend; }`
  - `location / { proxy_pass vers le service frontend; }` (ou `root` direct si
    nginx sert lui-même les fichiers statiques copiés du frontend — variante
    possible si vous préférez ne pas avoir de conteneur frontend séparé, mais
    dans ce projet on vous demande bien **3 services distincts**)
- Pensez aux en-têtes `proxy_set_header Host`, `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto`.

### Étape 5 – Construire et pousser les images sur Docker Hub
- Créez un compte Docker Hub (si vous n'en avez pas) et un dépôt (repository)
  pour chaque image (`backend`, `frontend`, éventuellement `nginx` si vous
  construisez une image custom).
- Taguez et poussez vos images :
  - `docker build -t <votre_user>/taskmanager-backend:1.0 ./backend`
  - `docker login`
  - `docker push <votre_user>/taskmanager-backend:1.0`
  - (idem pour le frontend et nginx si custom)

### Étape 6 – Pousser les images sur Amazon ECR
- Créez un **repository ECR privé** par image (ex : `taskmanager-backend`,
  `taskmanager-frontend`).
- Authentifiez Docker auprès d'ECR :
  - `aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com`
- Retaguez puis poussez vos images locales (ou celles tirées depuis Docker Hub)
  vers ECR :
  - `docker tag <votre_user>/taskmanager-backend:1.0 <account_id>.dkr.ecr.<region>.amazonaws.com/taskmanager-backend:1.0`
  - `docker push <account_id>.dkr.ecr.<region>.amazonaws.com/taskmanager-backend:1.0`
- Votre `docker-compose.yml` de **production** (celui utilisé sur l'EC2) doit
  référencer les images **ECR**, pas les images locales ni Docker Hub.

### Étape 7 – Provisionner l'instance EC2
- Lancez une instance EC2 (ex : Amazon Linux 2023 ou Ubuntu 22.04, `t2.micro`/
  `t3.micro`).
- Groupe de sécurité EC2 : ouvrez uniquement les ports nécessaires (`22` pour
  SSH depuis votre IP, `80`/`443` pour le trafic web depuis `0.0.0.0/0`).
- Attachez un **rôle IAM** à l'instance (ou configurez des credentials) lui
  permettant de faire `docker pull` depuis ECR.
- Installez Docker et le plugin Docker Compose sur l'instance.

### Étape 8 – Déployer sur EC2
- Copiez (ou générez directement sur l'instance) votre `docker-compose.yml` de
  production référençant les images ECR.
- Authentifiez-vous à ECR depuis l'EC2, puis lancez :
  - `docker compose pull`
  - `docker compose up -d`
- Vérifiez que le backend arrive bien à joindre RDS via `GET /api/health`.

### Étape 9 – Validation finale
- Accédez à l'application via l'IP publique (ou le nom DNS) de l'EC2 dans un
  navigateur : la todo-list doit s'afficher et être fonctionnelle (créer,
  cocher, supprimer une tâche).
- Vérifiez que les données persistent bien dans RDS (redémarrer les conteneurs
  ne doit pas faire perdre les tâches).

## 6. Variables d'environnement attendues par le backend

| Variable     | Description                                   | Exemple                          |
|--------------|------------------------------------------------|-----------------------------------|
| `PORT`       | Port d'écoute du serveur Express               | `3000`                            |
| `PGHOST`     | Endpoint de l'instance RDS                     | `taskmanager.xxxxx.eu-west-3.rds.amazonaws.com` |
| `PGPORT`     | Port PostgreSQL                                | `5432`                            |
| `PGUSER`     | Utilisateur PostgreSQL                         | `postgres`                        |
| `PGPASSWORD` | Mot de passe (à garder secret, jamais commité) | `********`                        |
| `PGDATABASE` | Nom de la base                                 | `taskmanager`                     |
| `PGSSL`      | Activer SSL vers RDS                           | `true`                            |

## 7. Checklist de livrables (critères d'évaluation)

- [ ] `backend/Dockerfile` fonctionnel et optimisé (image finale légère)
- [ ] `frontend/Dockerfile` fonctionnel
- [ ] Configuration nginx en reverse proxy (`/` → frontend, `/api` → backend)
- [ ] `docker-compose.yml` orchestrant les 3 services avec un réseau dédié
- [ ] Aucune donnée sensible (mot de passe RDS, clés AWS) commitée dans le dépôt
- [ ] Instance RDS PostgreSQL provisionnée et accessible uniquement depuis l'EC2
- [ ] Images poussées sur Docker Hub
- [ ] Images poussées sur Amazon ECR
- [ ] Instance EC2 fonctionnelle exécutant `docker compose` avec les images ECR
- [ ] Application accessible publiquement et pleinement fonctionnelle
- [ ] `DEPLOIEMENT.md` documentant toutes les étapes réalisées
- [ ] Groupes de sécurité correctement restreints (pas de `0.0.0.0/0` inutile)

## 8. Aide-mémoire commandes utiles

```bash
# Build local d'une image
docker build -t taskmanager-backend:1.0 ./backend

# Lancer/mettre à jour la stack avec docker-compose
docker compose up -d --build
docker compose logs -f
docker compose down

# Docker Hub
docker login
docker tag taskmanager-backend:1.0 <user>/taskmanager-backend:1.0
docker push <user>/taskmanager-backend:1.0

# Amazon ECR
aws ecr create-repository --repository-name taskmanager-backend
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com
docker tag taskmanager-backend:1.0 <account_id>.dkr.ecr.<region>.amazonaws.com/taskmanager-backend:1.0
docker push <account_id>.dkr.ecr.<region>.amazonaws.com/taskmanager-backend:1.0

# Sur l'instance EC2 (après installation de Docker)
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com
docker compose pull
docker compose up -d

# Vérifier la connexion à RDS depuis le backend
curl http://<ip-publique-ec2>/api/health
```

## 9. Points de vigilance / bonus possibles

- Ne jamais exposer le port `5432` de RDS publiquement.
- Ne jamais commiter de secrets (utiliser `.env` + `.gitignore`, ou AWS
  Secrets Manager en bonus).
- Bonus : utiliser des **tags d'image versionnés** (pas seulement `latest`)
  pour un vrai suivi de déploiement.
- Bonus : ajouter un pipeline CI/CD (GitHub Actions) qui build et pousse
  automatiquement les images vers ECR à chaque merge.

Bon courage 🚀
