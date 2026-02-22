-- ============================================================
-- Maroquinerie — Init base de données
-- Création des tables + données de test
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS Gestionnaires (
  ID_gestionnaire INT AUTO_INCREMENT PRIMARY KEY,
  Nom             VARCHAR(100) NOT NULL,
  Prenom          VARCHAR(100) NOT NULL,
  Email           VARCHAR(150) NOT NULL UNIQUE,
  Mot_de_passe    VARCHAR(255) NOT NULL,
  Role            VARCHAR(50)  NOT NULL DEFAULT 'gestionnaire',
  Date_de_creation DATE
);

CREATE TABLE IF NOT EXISTS Categories (
  ID_categorie INT AUTO_INCREMENT PRIMARY KEY,
  nom          VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Clients (
  ID_client        INT AUTO_INCREMENT PRIMARY KEY,
  Nom              VARCHAR(100) NOT NULL,
  Prenom           VARCHAR(100) NOT NULL,
  Email            VARCHAR(150) NOT NULL UNIQUE,
  Telephone        VARCHAR(20),
  Adresse          VARCHAR(255),
  Ville            VARCHAR(100),
  CodePostal       VARCHAR(10),
  Pays             VARCHAR(100),
  Date_inscription DATE,
  Mot_de_passe     VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Produits (
  ID_produit    INT AUTO_INCREMENT PRIMARY KEY,
  Reference     VARCHAR(50)    NOT NULL UNIQUE,
  Nom_produit   VARCHAR(200)   NOT NULL,
  Prix          DECIMAL(10,2)  NOT NULL,
  Taille_produit VARCHAR(50),
  ID_categorie  INT NOT NULL,
  image         VARCHAR(255),
  FOREIGN KEY (ID_categorie) REFERENCES Categories(ID_categorie)
);

CREATE TABLE IF NOT EXISTS Stock (
  ID_stock          INT AUTO_INCREMENT PRIMARY KEY,
  Quantite          INT  NOT NULL DEFAULT 0,
  Date_derniere_maj DATE,
  ID_produit        INT  NOT NULL UNIQUE,
  FOREIGN KEY (ID_produit) REFERENCES Produits(ID_produit)
);

CREATE TABLE IF NOT EXISTS Commande (
  ID_commande      INT AUTO_INCREMENT PRIMARY KEY,
  Date_commande    DATE NOT NULL,
  Statut_commande  VARCHAR(50) NOT NULL DEFAULT 'En cours',
  ID_client        INT NOT NULL,
  FOREIGN KEY (ID_client) REFERENCES Clients(ID_client)
);

CREATE TABLE IF NOT EXISTS Vendu (
  ID_vendu    INT AUTO_INCREMENT PRIMARY KEY,
  ID_produit  INT NOT NULL,
  ID_commande INT NOT NULL,
  Quantite    INT NOT NULL DEFAULT 1,
  FOREIGN KEY (ID_produit)  REFERENCES Produits(ID_produit),
  FOREIGN KEY (ID_commande) REFERENCES Commande(ID_commande)
);


-- ============================================================
-- DONNÉES
-- ============================================================

INSERT INTO Gestionnaires (Nom, Prenom, Email, Mot_de_passe, Role, Date_de_creation) VALUES
('Admin', 'Admin', 'admin@admin.com', 'admin', 'admin', '2024-01-01');

INSERT INTO Categories (ID_categorie, nom) VALUES
(1, 'Sacs à main'),
(2, 'Portefeuilles'),
(3, 'Ceintures'),
(4, 'Bagages'),
(5, 'Porte-cartes'),
(6, 'Accessoires en cuir');

INSERT INTO Produits (Reference, Nom_produit, Prix, Taille_produit, ID_categorie, image) VALUES
('SAC001', 'Sac cabas cuir noir',         289.99, 'Grand',  1, 'SAC001.jpg'),
('SAC002', 'Sac bandoulière cognac',       199.99, 'Petit',  1, 'SAC002.jpg'),
('SAC003', 'Sac à main bordeaux',          349.99, 'Moyen',  1, 'SAC003.jpg'),
('SAC004', 'Sac tote cuir naturel',        259.99, 'Grand',  1, 'SAC004.jpg'),
('SAC005', 'Pochette cuir marron',         129.99, 'Petit',  1, 'SAC005.jpg'),

('PRT001', 'Portefeuille long noir',        99.99, 'Unique', 2, 'PRT001.jpg'),
('PRT002', 'Portefeuille compact cognac',   79.99, 'Unique', 2, 'PRT002.jpg'),
('PRT003', 'Portefeuille zippé bordeaux',   89.99, 'Unique', 2, 'PRT003.jpg'),
('PRT004', 'Portefeuille homme marron',     74.99, 'Unique', 2, 'PRT004.jpg'),
('PRT005', 'Portefeuille femme nude',       84.99, 'Unique', 2, 'PRT005.jpg'),

('CNT001', 'Ceinture cuir noir 35mm',       89.99, '90 cm',  3, 'CNT001.jpg'),
('CNT002', 'Ceinture cuir marron 35mm',     89.99, '95 cm',  3, 'CNT002.jpg'),
('CNT003', 'Ceinture tressée cognac',       99.99, '100 cm', 3, 'CNT003.jpg'),
('CNT004', 'Ceinture fine noir femme',      79.99, '80 cm',  3, 'CNT004.jpg'),
('CNT005', 'Ceinture western marron',      109.99, '95 cm',  3, 'CNT005.jpg'),

('BAG001', 'Valise cabine cuir cognac',    699.99, '55 cm',  4, 'BAG001.jpg'),
('BAG002', 'Sac de voyage noir',           399.99, '48 cm',  4, 'BAG002.jpg'),
('BAG003', 'Sac week-end marron',          449.99, '52 cm',  4, 'BAG003.jpg'),
('BAG004', 'Valise soute cuir naturel',    899.99, '70 cm',  4, 'BAG004.jpg'),
('BAG005', 'Bagage à main bordeaux',       349.99, '45 cm',  4, 'BAG005.jpg'),

('PCT001', 'Porte-cartes slim noir',        39.99, 'Unique', 5, 'PCT001.jpg'),
('PCT002', 'Porte-cartes cognac',           44.99, 'Unique', 5, 'PCT002.jpg'),
('PCT003', 'Porte-cartes zippé bordeaux',   49.99, 'Unique', 5, 'PCT003.jpg'),
('PCT004', 'Porte-cartes marron',           34.99, 'Unique', 5, 'PCT004.jpg'),
('PCT005', 'Porte-cartes femme rose',       44.99, 'Unique', 5, 'PCT005.jpg'),

('ACC001', 'Porte-clés cuir noir',          24.99, 'Unique', 6, 'ACC001.jpg'),
('ACC002', 'Étui passeport cognac',         54.99, 'Unique', 6, 'ACC002.jpg'),
('ACC003', 'Manchette cuir marron',         69.99, 'Unique', 6, 'ACC003.jpg'),
('ACC004', 'Carnet cuir noir A5',           79.99, 'Unique', 6, 'ACC004.jpg'),
('ACC005', 'Porte-monnaie bordeaux',        39.99, 'Unique', 6, 'ACC005.jpg');

INSERT INTO Stock (Quantite, Date_derniere_maj, ID_produit) VALUES
(12, '2025-01-15', 1),
(8,  '2025-01-15', 2),
(5,  '2025-01-15', 3),
(15, '2025-01-15', 4),
(20, '2025-01-15', 5),

(25, '2025-01-15', 6),
(18, '2025-01-15', 7),
(3,  '2025-01-15', 8),
(22, '2025-01-15', 9),
(14, '2025-01-15', 10),

(16, '2025-01-15', 11),
(19, '2025-01-15', 12),
(11, '2025-01-15', 13),
(2,  '2025-01-15', 14),
(9,  '2025-01-15', 15),

(6,  '2025-01-15', 16),
(10, '2025-01-15', 17),
(8,  '2025-01-15', 18),
(4,  '2025-01-15', 19),
(7,  '2025-01-15', 20),

(30, '2025-01-15', 21),
(28, '2025-01-15', 22),
(1,  '2025-01-15', 23),
(35, '2025-01-15', 24),
(22, '2025-01-15', 25),

(40, '2025-01-15', 26),
(18, '2025-01-15', 27),
(12, '2025-01-15', 28),
(9,  '2025-01-15', 29),
(25, '2025-01-15', 30);

INSERT INTO Clients (Nom, Prenom, Email, Telephone, Adresse, Ville, CodePostal, Pays, Date_inscription, Mot_de_passe) VALUES
('Dupont', 'Sophie', 'sophie.dupont@gmail.com', '0612345678', '12 Rue des Roses',        'Paris',    '75008', 'France', '2024-03-01', SHA2('password123', 256)),
('Martin', 'Lucas',  'lucas.martin@gmail.com',  '0623456789', '5 Avenue Victor Hugo',    'Lyon',     '69006', 'France', '2024-04-15', SHA2('motdepasse',   256)),
('Bernard','Emma',   'emma.bernard@gmail.com',  '0634567890', '8 Boulevard des Capucines','Bordeaux','33000', 'France', '2024-06-20', SHA2('test1234',      256));

INSERT INTO Commande (ID_commande, Date_commande, Statut_commande, ID_client) VALUES
(1, '2024-04-10', 'Terminé',  1),
(2, '2024-08-22', 'En cours', 1),
(3, '2024-11-05', 'Annulée',  1),
(4, '2024-05-18', 'Terminé',  2),
(5, '2025-01-10', 'En cours', 2),
(6, '2024-07-03', 'Terminé',  3),
(7, '2024-09-14', 'Annulée',  3),
(8, '2025-01-20', 'Terminé',  3);

INSERT INTO Vendu (ID_produit, ID_commande, Quantite) VALUES
(1,  1, 1), (6,  1, 1),
(11, 2, 1), (21, 2, 2),
(16, 3, 1),
(2,  4, 1), (7,  4, 1), (26, 4, 1),
(17, 5, 1), (29, 5, 1),
(3,  6, 1), (22, 6, 2),
(19, 7, 1),
(5,  8, 1), (10, 8, 1), (27, 8, 1);