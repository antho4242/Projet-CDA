# Maroquinerie Artisanale --- Application Web

Application de gestion e-commerce pour une maroquinerie artisanale,
développée dans le cadre de l'examen **Concepteur Développeur
d'Applications (CDA)**.

------------------------------------------------------------------------

## Stack technique

  Élément            Technologie
  ------------------ -----------------------------------------
  Runtime            Node.js
  Framework          Express.js
  Templates          EJS
  Base de données    MySQL 8
  Conteneurisation   Docker & Docker Compose
  Driver SQL         mysql2/promise (pool)
  Authentification   express-session + SHA256 (crypto natif)
  CSS                Custom --- Inter + Playfair Display
  Port               8080

------------------------------------------------------------------------

## Prérequis

-   Docker Desktop\
-   Git

Aucune installation locale de Node.js ou MySQL n'est nécessaire :
l'application est entièrement conteneurisée.

------------------------------------------------------------------------

## Installation et lancement

``` bash
# Cloner le dépôt
git clone https://github.com/antho4242/Projet-CDA.git
cd Projet-CDA

# Construire et démarrer les conteneurs
docker compose up --build
```

Application accessible sur :

http://localhost:8080

------------------------------------------------------------------------

## Réinitialisation de la base de données

La base `maroquinerie` est automatiquement créée au premier démarrage
grâce au script :

database/seed.sql

Pour réinitialiser complètement la base :

``` bash
docker compose down -v
docker compose up --build
```

------------------------------------------------------------------------

## Variables d'environnement

Les variables sont définies dans `docker-compose.yml`.

Configuration actuelle :

    DB_HOST=db
    DB_USER=root
    DB_PASSWORD=root
    DB_NAME=maroquinerie
    DB_PORT=3306

------------------------------------------------------------------------

## Structure du projet

    Projet-CDA/
    ├── app.js
    ├── Dockerfile
    ├── docker-compose.yml
    ├── database/
    │   ├── db.js
    │   └── seed.sql
    ├── modules/
    │   └── dab.js
    ├── routes/
    │   └── api.js
    ├── public/
    │   ├── css/style.css
    │   └── images/produits/
    └── views/
        ├── partials/
        └── pages/

------------------------------------------------------------------------

## Fonctionnalités

### Espace public

-   Page d'accueil avec vidéo hero
-   Catalogue groupé par catégorie
-   Fiche produit avec gestion du stock en temps réel
-   Badge automatique "Rupture de stock"
-   Simulateur DAB (répartition optimale en coupures)

### Authentification

-   Inscription client avec hachage SHA256
-   Connexion unifiée gestionnaire / client
-   Middleware de protection par rôle

### Espace client

-   Panier en session
-   Confirmation de commande avec contrôle du stock
-   Historique des commandes
-   Annulation conditionnelle avec restauration automatique du stock

### Dashboard gestionnaire

-   Statistiques globales (chiffre d'affaires, volumes)
-   Graphiques interactifs
-   CRUD produits
-   Gestion des clients et gestionnaires
-   Gestion des commandes
-   Rapports d'analyse (top produits, clients fidèles, annulations)

------------------------------------------------------------------------

## API REST

  Méthode   Route               Description
  --------- ------------------- ----------------------
  GET       /api/produits       Liste des produits
  GET       /api/produits/:id   Détail d'un produit
  GET       /api/categories     Liste des catégories
  POST      /api/produits       Créer un produit
  PUT       /api/produits/:id   Modifier un produit
  DELETE    /api/produits/:id   Supprimer un produit

------------------------------------------------------------------------

## Comptes de test

### Gestionnaire

  Email             Mot de passe
  ----------------- --------------
  admin@admin.com   admin

### Clients

  Email                     Mot de passe
  ------------------------- --------------
  sophie.dupont@gmail.com   password123
  lucas.martin@gmail.com    motdepasse
  emma.bernard@gmail.com    test1234

------------------------------------------------------------------------

## Modèle de données

-   Gestionnaires\
-   Clients\
-   Categories\
-   Produits\
-   Stock\
-   Commande\
-   Vendu

Relations assurées par clés étrangères (InnoDB).

------------------------------------------------------------------------

## Sécurité

-   Hachage SHA256 des mots de passe
-   Protection des routes par middleware selon le rôle
-   Validation du stock avant confirmation de commande
-   Sessions sécurisées via express-session
-   Isolation des services via Docker

------------------------------------------------------------------------

## Auteur

Anthony Valour\
Projet CDA --- Concepteur Développeur d'Applications\
GitHub : https://github.com/antho4242
