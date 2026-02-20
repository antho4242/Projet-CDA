const express = require("express");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
require("dotenv").config();

const { calculerCoupures } = require("./modules/dab");
const apiRouter = require("./routes/api");
const db = require("./database/db");

const app = express();
const PORT = 8080;

// ------------------
// Helpers
// ------------------

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ------------------
// Config Express
// ------------------

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "monSuperSecretChangeLe",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/api", apiRouter);

// Variables dispo dans toutes les vues
app.use((req, res, next) => {
  res.locals.formatDate = formatDate;
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === "gestionnaire";
  res.locals.login = req.session.user?.prenom || null;
  next();
});

// ------------------
// Middlewares
// ------------------

function requireGestionnaire(req, res, next) {
  if (!req.session.user || req.session.user.role !== "gestionnaire") {
    return res.redirect("/auth/login");
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
}

function requireClient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "client") {
    return res.redirect("/auth/login");
  }
  next();
}

// ------------------
// Routes publiques
// ------------------

app.get("/", (req, res) => {
  res.render("pages/index", { title: "Accueil" });
});

app.get("/boutique", (req, res) => {
  res.render("pages/boutique", { title: "Boutique" });
});

app.get("/boutique/produit/:id", (req, res) => {
  res.render("pages/produit", {
    title: "Produit",
    produitId: req.params.id,
  });
});

// ------------------
// Panier + Commande
// ------------------

// Affiche le panier
app.get("/panier", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "client") return res.redirect("/");

    const panier = req.session.panier || [];

    // Enrichit le panier avec les infos produits depuis MySQL
    const produits = [];
    let total = 0;

    for (const item of panier) {
      const [rows] = await db.query(
        `
        SELECT p.*, c.nom AS categorie, s.Quantite AS stock
        FROM Produits p
        JOIN Categories c ON p.ID_categorie = c.ID_categorie
        LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
        WHERE p.ID_produit = ?
        `,
        [item.id]
      );

      if (rows.length) {
        const p = rows[0];
        const sous_total = parseFloat(p.Prix) * item.quantite;
        total += sous_total;
        produits.push({ ...p, quantite: item.quantite, sous_total });
      }
    }

    res.render("pages/panier", { title: "Mon Panier", produits, total });
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

// Ajouter au panier
app.post("/panier/ajouter", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "client") return res.redirect("/");

    const id = parseInt(req.body.id);
    const quantite = parseInt(req.body.quantite) || 1;

    if (!Number.isFinite(id) || id <= 0) return res.redirect("/boutique");

    if (!req.session.panier) req.session.panier = [];

    const existing = req.session.panier.find((p) => p.id === id);
    if (existing) {
      existing.quantite += quantite;
    } else {
      req.session.panier.push({ id, quantite });
    }

    res.redirect("/panier");
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

// Modifier quantité dans le panier
app.post("/panier/modifier", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.body.id);
    const quantite = parseInt(req.body.quantite);

    if (!req.session.panier) return res.redirect("/panier");
    if (!Number.isFinite(id) || id <= 0) return res.redirect("/panier");

    if (!Number.isFinite(quantite)) return res.redirect("/panier");

    if (quantite <= 0) {
      req.session.panier = req.session.panier.filter((p) => p.id !== id);
    } else {
      const item = req.session.panier.find((p) => p.id === id);
      if (item) item.quantite = quantite;
    }

    res.redirect("/panier");
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

// Supprimer un article du panier
app.post("/panier/supprimer", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.body.id);

    if (req.session.panier && Number.isFinite(id)) {
      req.session.panier = req.session.panier.filter((p) => p.id !== id);
    }

    res.redirect("/panier");
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

// Confirmer la commande
app.post("/commande/confirmer", requireAuth, async (req, res) => {
  if (req.session.user.role !== "client") return res.redirect("/");

  const panier = req.session.panier || [];
  if (!panier.length) return res.redirect("/panier");

  const clientId = req.session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Vérifie le stock pour chaque produit
    for (const item of panier) {
      const [rows] = await db.query(
        "SELECT Quantite FROM Stock WHERE ID_produit = ?",
        [item.id]
      );
      if (!rows.length || rows[0].Quantite < item.quantite) {
        return res.redirect("/panier?erreur=stock");
      }
    }

    // Crée la commande
    const [result] = await db.query(
      "INSERT INTO Commande (Date_commande, Statut_commande, ID_client) VALUES (?, 'En cours', ?)",
      [today, clientId]
    );
    const commandeId = result.insertId;

    // Insère les produits vendus + met à jour le stock
    for (const item of panier) {
      await db.query(
        "INSERT INTO Vendu (ID_produit, ID_commande, Quantite) VALUES (?, ?, ?)",
        [item.id, commandeId, item.quantite]
      );
      await db.query(
        "UPDATE Stock SET Quantite = Quantite - ?, Date_derniere_maj = ? WHERE ID_produit = ?",
        [item.quantite, today, item.id]
      );
    }

    // Vide le panier
    req.session.panier = [];
    res.redirect(`/espace-client/commande/${commandeId}`);
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

// ------------------
// Auth
// ------------------

app.get("/auth/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/login", { title: "Connexion", error: null });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [managers] = await db.query(
      "SELECT * FROM Gestionnaires WHERE Email = ?",
      [email]
    );

    if (managers.length) {
      const m = managers[0];

      if (m.Mot_de_passe !== password) {
        return res.render("pages/login", {
          title: "Connexion",
          error: "Mot de passe incorrect.",
        });
      }

      req.session.user = {
        id: m.Id,
        nom: m.Nom,
        prenom: m.Prenom,
        email: m.Email,
        role: "gestionnaire",
      };

      return res.redirect("/dashboard");
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");

    const [clients] = await db.query("SELECT * FROM Clients WHERE Email = ?", [
      email,
    ]);

    if (!clients.length) {
      return res.render("pages/login", {
        title: "Connexion",
        error: "Compte introuvable.",
      });
    }

    const c = clients[0];

    if (c.Mot_de_passe !== hash) {
      return res.render("pages/login", {
        title: "Connexion",
        error: "Mot de passe incorrect.",
      });
    }

    req.session.user = {
      id: c.ID_client,
      nom: c.Nom,
      prenom: c.Prenom,
      email: c.Email,
      role: "client",
    };

    res.redirect("/espace-client");
  } catch (err) {
    console.error(err);
    res.render("pages/login", { title: "Connexion", error: "Erreur serveur." });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/auth/register", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("pages/register", { title: "Inscription", error: null });
});

app.post("/auth/register", async (req, res) => {
  const {
    nom,
    prenom,
    email,
    telephone,
    adresse,
    ville,
    codepostal,
    pays,
    password,
    password_confirm,
  } = req.body;

  if (password !== password_confirm) {
    return res.render("pages/register", {
      title: "Inscription",
      error: "Les mots de passe ne correspondent pas.",
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT ID_client FROM Clients WHERE Email = ?",
      [email]
    );

    if (existing.length) {
      return res.render("pages/register", {
        title: "Inscription",
        error: "Email déjà utilisé.",
      });
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");
    const today = new Date().toISOString().slice(0, 10);

    await db.query(
      `
      INSERT INTO Clients
      (Nom, Prenom, Email, Telephone, Adresse, Ville, CodePostal, Pays, Date_inscription, Mot_de_passe)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nom,
        prenom,
        email,
        telephone,
        adresse,
        ville,
        codepostal,
        pays,
        today,
        hash,
      ]
    );

    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.render("pages/register", { title: "Inscription", error: "Erreur serveur." });
  }
});

// ------------------
// Dashboard gestionnaire (home)
// ------------------

app.get("/dashboard", requireGestionnaire, async (req, res) => {
  try {
    const [produits] = await db.query("SELECT COUNT(*) AS total FROM Produits");
    const [clients] = await db.query("SELECT COUNT(*) AS total FROM Clients");
    const [commandes] = await db.query("SELECT COUNT(*) AS total FROM Commande");
    const [faibleStock] = await db.query(
      "SELECT COUNT(*) AS total FROM Stock WHERE Quantite <= 5"
    );

    res.render("pages/dashboard/index", {
      title: "Dashboard",
      stats: {
        produits: produits[0].total,
        clients: clients[0].total,
        commandes: commandes[0].total,
        faibleStock: faibleStock[0].total,
      },
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Dashboard - Produits
// ------------------

app.get("/dashboard/produits", requireGestionnaire, async (req, res) => {
  try {
    const [produits] = await db.query(
      `
      SELECT p.*, c.nom AS categorie, s.Quantite AS stock
      FROM Produits p
      JOIN Categories c ON p.ID_categorie = c.ID_categorie
      LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
      ORDER BY c.nom, p.Nom_produit
      `
    );

    res.render("pages/dashboard/produits", { title: "Produits", produits });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.post("/dashboard/produits/supprimer/:id", requireGestionnaire, async (req, res) => {
  try {
    await db.query("DELETE FROM Stock WHERE ID_produit = ?", [req.params.id]);
    await db.query("DELETE FROM Produits WHERE ID_produit = ?", [req.params.id]);
    res.redirect("/dashboard/produits");
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Dashboard - Clients
// ------------------

app.get("/dashboard/clients", requireGestionnaire, async (req, res) => {
  try {
    const [clients] = await db.query("SELECT * FROM Clients ORDER BY Nom");
    res.render("pages/dashboard/clients", { title: "Clients", clients });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.post("/dashboard/clients/supprimer/:id", requireGestionnaire, async (req, res) => {
  try {
    await db.query("DELETE FROM Clients WHERE ID_client = ?", [req.params.id]);
    res.redirect("/dashboard/clients");
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Dashboard - Commandes
// ------------------

app.get("/dashboard/commandes", requireGestionnaire, async (req, res) => {
  try {
    const [commandes] = await db.query(
      `
      SELECT c.*, cl.Nom, cl.Prenom
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      ORDER BY c.Date_commande DESC
      `
    );

    res.render("pages/dashboard/commandes", { title: "Commandes", commandes });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.post("/dashboard/commandes/statut/:id", requireGestionnaire, async (req, res) => {
  try {
    const { statut } = req.body;

    await db.query(
      "UPDATE Commande SET Statut_commande = ? WHERE ID_commande = ?",
      [statut, req.params.id]
    );

    res.redirect("/dashboard/commandes");
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Dashboard - Rapports
// ------------------

app.get("/dashboard/rapports", requireGestionnaire, async (req, res) => {
  try {
    const [faibleStock] = await db.query(
      `
      SELECT p.Nom_produit, s.Quantite
      FROM Stock s
      JOIN Produits p ON s.ID_produit = p.ID_produit
      WHERE s.Quantite <= 5
      ORDER BY s.Quantite ASC
      `
    );

    const [plusVendus] = await db.query(
      `
      SELECT p.Nom_produit, SUM(v.Quantite) AS total_vendu
      FROM Vendu v
      JOIN Produits p ON v.ID_produit = p.ID_produit
      GROUP BY p.ID_produit
      ORDER BY total_vendu DESC
      LIMIT 5
      `
    );

    const [clientsFideles] = await db.query(
      `
      SELECT cl.Nom, cl.Prenom, COUNT(c.ID_commande) AS nb_commandes
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      GROUP BY c.ID_client
      ORDER BY nb_commandes DESC
      LIMIT 5
      `
    );

    const [clientsAnnulations] = await db.query(
      `
      SELECT cl.Nom, cl.Prenom, COUNT(c.ID_commande) AS nb_annulations
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      WHERE c.Statut_commande = 'Annulée'
      GROUP BY c.ID_client
      ORDER BY nb_annulations DESC
      LIMIT 5
      `
    );

    res.render("pages/dashboard/rapports", {
      title: "Rapports",
      faibleStock,
      plusVendus,
      clientsFideles,
      clientsAnnulations,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Espace client
// ------------------

app.get("/espace-client", requireClient, async (req, res) => {
  try {
    const user = req.session.user;

    const [commandes] = await db.query(
      `
      SELECT c.ID_commande, c.Date_commande, c.Statut_commande,
             COALESCE(SUM(v.Quantite), 0) AS nb_produits
      FROM Commande c
      LEFT JOIN Vendu v ON v.ID_commande = c.ID_commande
      WHERE c.ID_client = ?
      GROUP BY c.ID_commande
      ORDER BY c.Date_commande DESC
      `,
      [user.id]
    );

    res.render("pages/client/index", {
      title: "Mon espace",
      user,
      commandes,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// Détail commande : produits + total
app.get("/espace-client/commande/:id", requireAuth, async (req, res) => {
  try {
    const [commande] = await db.query(
      "SELECT * FROM Commande WHERE ID_commande = ? AND ID_client = ?",
      [req.params.id, req.session.user.id]
    );

    if (!commande.length) {
      return res.status(404).render("pages/404", { title: "Introuvable" });
    }

    const [produits] = await db.query(
      `
      SELECT p.Nom_produit, p.Prix, v.Quantite,
             (p.Prix * v.Quantite) AS sous_total
      FROM Vendu v
      JOIN Produits p ON v.ID_produit = p.ID_produit
      WHERE v.ID_commande = ?
      `,
      [req.params.id]
    );

    const total = produits.reduce((sum, p) => sum + Number(p.sous_total || 0), 0);

    res.render("pages/client/commande", {
      title: `Commande #${req.params.id}`,
      commande: commande[0],
      produits,
      total,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.post("/espace-client/commande/:id/annuler", requireClient, async (req, res) => {
  try {
    const user = req.session.user;
    const id = req.params.id;

    const [rows] = await db.query(
      "SELECT Statut_commande FROM Commande WHERE ID_commande = ? AND ID_client = ?",
      [id, user.id]
    );

    if (!rows.length) return res.redirect("/espace-client");

    if (rows[0].Statut_commande !== "En cours") {
      return res.redirect(`/espace-client/commande/${id}`);
    }

    await db.query(
      "UPDATE Commande SET Statut_commande = 'Annulée' WHERE ID_commande = ? AND ID_client = ?",
      [id, user.id]
    );

    res.redirect("/espace-client");
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// DAB
// ------------------

app.get("/dab", (req, res) => {
  if (!req.query.montant) {
    return res.render("pages/dab", { title: "DAB" });
  }

  const montant = parseFloat(req.query.montant);
  const devise = req.query.devise || "euros";

  res.redirect(`/dab/${devise}/${montant}`);
});

app.get("/dab/:devise/:montant", (req, res) => {
  const montant = parseFloat(req.params.montant);
  const devise = req.params.devise;

  if (isNaN(montant) || montant <= 0) {
    return res.render("pages/dab-result", {
      title: "DAB",
      montant: req.params.montant,
      devise,
      repartition: [],
      plusPetite: null,
    });
  }

  const { repartition, plusPetite } = calculerCoupures(montant, devise);

  res.render("pages/dab-result", {
    title: `DAB - ${montant} ${devise}`,
    montant,
    devise,
    repartition,
    plusPetite,
  });
});

// ------------------
// Erreurs
// ------------------

app.get("/erreur", (req, res) => {
  res.render("pages/error", { title: "Erreur" });
});

app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page introuvable" });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});