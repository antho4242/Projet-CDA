# Maroquinerie Artisanale — Application Web

Application de gestion e-commerce pour une maroquinerie artisanale, développée dans le cadre de l'examen **Concepteur Développeur d'Applications (CDA)**.

---

## Stack technique

| Élément | Technologie |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Templates | EJS |
| Base de données | MySQL (WAMP) |
| Driver SQL | mysql2/promise (pool) |
| Authentification | express-session + SHA256 (crypto natif) |
| CSS | Custom — Inter + Playfair Display |
| Port | 8080 |

---

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- [WAMP](https://www.wampserver.com/) (MySQL sur localhost:3306)
- Git

---

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/antho4242/Projet-CDA.git
cd Projet-CDA

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos identifiants MySQL
```

### Variables d'environnement (`.env`)

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=maroquinerie
DB_PORT=3306
```

### Base de données

1. Démarrer WAMP
2. Ouvrir phpMyAdmin
3. Créer la base `maroquinerie`
4. Importer `database/seed.sql` (**décocher** "Activer la vérification des clés étrangères")

### Lancer l'application

```bash
npm start
# Serveur disponible sur http://localhost:8080
```

---

## Structure du projet

```
Projet-CDA/
├── app.js                      ← Serveur principal, routes, middlewares
├── .env                        ← Variables d'environnement (non versionné)
├── database/
│   ├── db.js                   ← Pool MySQL mysql2/promise
│   └── seed.sql                ← Données de test
├── modules/
│   └── dab.js                  ← Module DAB — calcul des coupures
├── routes/
│   └── api.js                  ← API REST JSON /api/*
├── public/
│   ├── css/style.css           ← Design system complet
│   └── images/produits/        ← Photos produits (Reference.jpg)
└── views/
    ├── partials/               ← header, nav, footer
    └── pages/                  ← Vues EJS par section
```

---

## Fonctionnalités

### Espace public
- Page d'accueil avec vidéo hero en arrière-plan
- Catalogue boutique groupé par catégorie, ordre personnalisé
- Fiche produit avec stock en temps réel et badge "Rupture de stock"
- Simulateur DAB — répartition optimale en coupures (euros/dollars)

### Authentification
- Inscription client avec hachage SHA256 du mot de passe
- Connexion unifiée gestionnaire / client par email
- Sessions Express avec middleware de protection par rôle

### Espace client
- Panier session — ajout, modification de quantité, suppression
- Confirmation de commande avec vérification du stock
- Historique des commandes avec statut
- Annulation de commande (statut "En cours" uniquement) avec restauration automatique du stock

### Dashboard gestionnaire
- Statistiques globales avec chiffre d'affaires
- Graphiques interactifs : ventes par catégorie, commandes par statut, alertes stock faible
- CRUD produits avec modification du stock inline
- Gestion des clients et des gestionnaires
- Gestion des commandes avec détail dépliable et changement de statut
- Rapports d'analyse : top produits, clients fidèles, annulations
- Restauration automatique du stock lors de l'annulation d'une commande

---

## API REST

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/produits` | Liste des produits (`?categorie=` optionnel) |
| GET | `/api/produits/:id` | Détail d'un produit |
| GET | `/api/categories` | Liste des catégories |
| POST | `/api/produits` | Créer un produit |
| PUT | `/api/produits/:id` | Modifier un produit |
| DELETE | `/api/produits/:id` | Supprimer un produit |

---

## Comptes de test

### Gestionnaire
| Email | Mot de passe |
|---|---|
| admin@admin.com | admin |

### Clients
| Email | Mot de passe |
|---|---|
| sophie.dupont@gmail.com | password123 |
| lucas.martin@gmail.com | motdepasse |
| emma.bernard@gmail.com | test1234 |

---

## Modèle de données

```
Gestionnaires  (Id, Nom, Prenom, Email, Mot_de_passe, Role, Date_de_creation)
Clients        (ID_client, Nom, Prenom, Email, Telephone, Adresse, Ville, CodePostal, Pays, Date_inscription, Mot_de_passe)
Categories     (ID_categorie, nom)
Produits       (ID_produit, Reference, Nom_produit, Prix, Taille_produit, ID_categorie, image)
Stock          (ID_stock, Quantite, Date_derniere_maj, ID_produit)
Commande       (ID_commande, Date_commande, Statut_commande, ID_client)
Vendu          (ID_vendu, ID_produit, ID_commande, Quantite)
```

---

## Sécurité

- Mots de passe clients hachés en SHA256 via le module `crypto` natif Node.js
- Protection des routes par middleware selon le rôle (`requireGestionnaire`, `requireClient`, `requireAuth`)
- Validation des stocks avant confirmation de commande
- Sessions sécurisées avec `express-session`

---

## Auteur

**Anthony** — Projet CDA  
GitHub : [@antho4242](https://github.com/antho4242)