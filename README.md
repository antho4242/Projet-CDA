# Maroquinerie Artisanale --- Application Web

Application de gestion e-commerce pour une maroquinerie artisanale,
développée dans le cadre de l'examen **Concepteur Développeur
d'Applications (CDA)**.

------------------------------------------------------------------------

## Stack technique

  Élément            Technologie
  ------------------ -----------------------------------------
  Runtime            Node.js 20
  Framework          Express.js 5
  Templates          EJS
  Base de données    MySQL 8
  Conteneurisation   Docker & Docker Compose
  Driver SQL         mysql2/promise (pool)
  Authentification   express-session + SHA256 (clients)
  Tests              Jest + Supertest
  CI                 GitHub Actions
  CSS                Custom --- Inter + Playfair Display
  Port               8080

------------------------------------------------------------------------

## Prérequis

-   Docker Desktop\
-   Git

Aucune installation locale de Node.js ou MySQL n'est nécessaire :
l'application est entièrement conteneurisée.

Pour lancer les tests unitaires en local, Node.js 20 et npm sont requis.

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
    ├── app.js                      # Point d'entrée : routes, middlewares, session
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json                # Scripts : start, test
    ├── .github/workflows/
    │   └── unit-tests.yml          # CI : npm test sur push et PR
    ├── __tests__/
    │   └── app.flows.test.js       # Tests unitaires T-01 à T-07
    ├── database/
    │   ├── db.js
    │   └── seed.sql
    ├── modules/
    │   └── dab.js
    ├── routes/
    │   └── api.js
    ├── public/
    │   ├── styles/style.css
    │   └── images/produits/
    ├── docs/
    │   └── dossier-supplement.md   # Sections complétées pour le dossier CDA
    └── views/
        ├── partials/
        └── pages/

------------------------------------------------------------------------

## Routes principales

  Route                              Rôle           Description
  ---------------------------------- -------------- ------------------------------------------
  /                                  public         Page d'accueil
  /boutique                          public         Catalogue par catégorie
  /boutique/produit/:id              public         Fiche produit
  /auth/login                        public         Connexion client / gestionnaire
  /auth/register                     public         Inscription client
  /espace-client                     client         Historique des commandes
  /espace-client/commande/:id        client         Détail d'une commande
  /panier                            client         Panier en session
  /dashboard                         gestionnaire   Tableau de bord
  /dashboard/produits                gestionnaire   CRUD produits
  /dashboard/commandes               gestionnaire   Gestion des commandes
  /dab                               public         Simulateur DAB

Redirections après authentification :

-   Inscription client → `/auth/login`
-   Connexion client → `/espace-client`
-   Connexion gestionnaire → `/dashboard`

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
  --------- ------------------- ------------------------------------------
  GET       /api/produits       Liste des produits (filtre : `?categorie=Sacs`)
  GET       /api/produits/:id   Détail d'un produit
  GET       /api/categories     Liste des catégories
  POST      /api/produits       Créer un produit
  PUT       /api/produits/:id   Modifier un produit
  DELETE    /api/produits/:id   Supprimer un produit

------------------------------------------------------------------------

## Tests

Les parcours critiques sont couverts par des tests unitaires (Jest +
Supertest) avec mock de la couche base de données.

``` bash
npm install
npm test
```

Couverture des scénarios :

  ID     Fonctionnalité              Résultat attendu
  ------ --------------------------- ------------------------------------------
  T-01   Inscription client          Compte créé, redirect `/auth/login`
  T-02   Connexion client            Session active, redirect `/espace-client`
  T-03   Connexion gestionnaire      Dashboard accessible
  T-04   Ajout panier                Panier session mis à jour
  T-05   Confirmation commande       Commande créée, stock réduit
  T-06   Stock insuffisant           Redirect `/panier?erreur=stock`
  T-07   Annulation commande         Statut Annulée, stock restauré

Fichier : `__tests__/app.flows.test.js`

------------------------------------------------------------------------

## CI / CD

Un workflow GitHub Actions exécute les tests automatiquement :

-   Fichier : `.github/workflows/unit-tests.yml`
-   Déclenchement : push et pull_request
-   Étapes : checkout, Node.js 20, `npm ci`, `npm test`

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

Relations assurées par clés étrangères (InnoDB, charset utf8mb4).

Voir `database/seed.sql` pour le schéma physique (MPD) et les données
de test. Le détail des sections complétées pour le dossier CDA se

------------------------------------------------------------------------

## Sécurité

-   Hachage SHA256 des mots de passe **clients** (inscription + connexion)
-   Comptes **gestionnaires** : mot de passe comparé en clair (comptes
    seed de démonstration uniquement ; en production, migrer vers bcrypt
    avec sel par utilisateur)
-   Protection des routes par middleware selon le rôle
-   Requêtes SQL paramétrées (protection injection SQL)
-   Validation du stock avant confirmation de commande
-   Sessions via express-session
-   Isolation des services via Docker

------------------------------------------------------------------------

## Auteur

Anthony Valour\
Projet CDA --- Concepteur Développeur d'Applications\
GitHub : https://github.com/antho4242
