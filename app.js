const express = require("express");
const path    = require("path");
const session = require("express-session");
const crypto  = require("crypto");
require("dotenv").config();

const { calculerCoupures } = require("./modules/dab");
const apiRouter            = require("./routes/api");
const db                   = require("./database/db");

const app  = express();
const PORT = 8080;

// ------------------
// Helpers 
// ------------------

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function icon(name, size = 18) {
  const b = `xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    home:      `<svg ${b}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    store:     `<svg ${b}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    dashboard: `<svg ${b}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    user:      `<svg ${b}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    logout:    `<svg ${b}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    login:     `<svg ${b}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
    register:  `<svg ${b}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    cart:      `<svg ${b}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    plus:      `<svg ${b}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    edit:      `<svg ${b}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:     `<svg ${b}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    save:      `<svg ${b}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    back:      `<svg ${b}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    eye:       `<svg ${b}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    cancel:    `<svg ${b}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    check:     `<svg ${b}><polyline points="20 6 9 17 4 12"/></svg>`,
    package:   `<svg ${b}><path d="M12 2l9 4.9V17L12 22 3 17V6.9L12 2z"/><polyline points="12 22 12 12"/><polyline points="3 7 12 12 21 7"/></svg>`,
    users:     `<svg ${b}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    orders:    `<svg ${b}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    alert:     `<svg ${b}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    key:       `<svg ${b}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    chart:     `<svg ${b}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    dab:       `<svg ${b}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    error:     `<svg ${b}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    search:    `<svg ${b}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  };
  return icons[name] || icons["error"];
}

// ------------------
// Config Express 
// ------------------

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session AVANT tout le reste
app.use(session({
  secret: "monSuperSecretChangeLe",
  resave: false,
  saveUninitialized: false,
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/api", apiRouter);

// Locals APRÈS session
app.use((req, res, next) => {
  res.locals.icon       = icon;
  res.locals.formatDate = formatDate;
  res.locals.user       = req.session.user || null;
  res.locals.isAdmin    = req.session.user?.role === "gestionnaire";
  res.locals.login      = req.session.user?.prenom || null;
  next();
});

// ------------------
// Middlewares de protection
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
  res.render("pages/produit", { title: "Produit", produitId: req.params.id });
});

// ------------------
// Panier + Commande
// ------------------

app.get("/panier", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "client") return res.redirect("/");

    const panier   = req.session.panier || [];
    const produits = [];
    let total      = 0;

    for (const item of panier) {
      const [rows] = await db.query(`
        SELECT p.*, c.nom AS categorie, s.Quantite AS stock
        FROM Produits p
        JOIN Categories c ON p.ID_categorie = c.ID_categorie
        LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
        WHERE p.ID_produit = ?
      `, [item.id]);

      if (rows.length) {
        const p         = rows[0];
        const sous_total = parseFloat(p.Prix) * item.quantite;
        total           += sous_total;
        produits.push({ ...p, quantite: item.quantite, sous_total });
      }
    }

    res.render("pages/panier", { title: "Mon Panier", produits, total });
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

app.post("/panier/ajouter", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "client") return res.redirect("/");

    const id       = parseInt(req.body.id);
    const quantite = parseInt(req.body.quantite) || 1;

    if (!Number.isFinite(id) || id <= 0) return res.redirect("/boutique");

    if (!req.session.panier) req.session.panier = [];

    const existing = req.session.panier.find(p => p.id === id);
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

app.post("/panier/modifier", requireAuth, (req, res) => {
  try {
    const id       = parseInt(req.body.id);
    const quantite = parseInt(req.body.quantite);

    if (!req.session.panier) return res.redirect("/panier");

    if (quantite <= 0) {
      req.session.panier = req.session.panier.filter(p => p.id !== id);
    } else {
      const item = req.session.panier.find(p => p.id === id);
      if (item) item.quantite = quantite;
    }

    res.redirect("/panier");
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

app.post("/panier/supprimer", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.body.id);
    if (req.session.panier) {
      req.session.panier = req.session.panier.filter(p => p.id !== id);
    }
    res.redirect("/panier");
  } catch (err) {
    console.error(err);
    res.redirect("/panier?erreur=serveur");
  }
});

app.post("/commande/confirmer", requireAuth, async (req, res) => {
  if (req.session.user.role !== "client") return res.redirect("/");

  const panier   = req.session.panier || [];
  if (!panier.length) return res.redirect("/panier");

  const clientId = req.session.user.id;
  const today    = new Date().toISOString().slice(0, 10);

  try {
    // Vérifie le stock
    for (const item of panier) {
      const [rows] = await db.query(
        "SELECT Quantite FROM Stock WHERE ID_produit = ?", [item.id]
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

    // Insère produits vendus + met à jour le stock
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
    // Vérifie gestionnaire
    const [managers] = await db.query(
      "SELECT * FROM Gestionnaires WHERE Email = ?", [email]
    );

    if (managers.length) {
      const m = managers[0];
      if (m.Mot_de_passe !== password) {
        return res.render("pages/login", { title: "Connexion", error: "Mot de passe incorrect." });
      }
      req.session.user = {
        id: m.Id, nom: m.Nom, prenom: m.Prenom, email: m.Email, role: "gestionnaire"
      };
      return res.redirect("/dashboard");
    }

    // Vérifie client 
    const hash      = crypto.createHash("sha256").update(password).digest("hex");
    const [clients] = await db.query(
      "SELECT * FROM Clients WHERE Email = ?", [email]
    );

    if (!clients.length) {
      return res.render("pages/login", { title: "Connexion", error: "Compte introuvable." });
    }

    const c = clients[0];
    if (c.Mot_de_passe !== hash) {
      return res.render("pages/login", { title: "Connexion", error: "Mot de passe incorrect." });
    }

    req.session.user = {
      id: c.ID_client, nom: c.Nom, prenom: c.Prenom, email: c.Email, role: "client"
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
  const { nom, prenom, email, telephone, adresse, ville, codepostal, pays, password, password_confirm } = req.body;

  if (password !== password_confirm) {
    return res.render("pages/register", {
      title: "Inscription", error: "Les mots de passe ne correspondent pas."
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT ID_client FROM Clients WHERE Email = ?", [email]
    );
    if (existing.length) {
      return res.render("pages/register", { title: "Inscription", error: "Email déjà utilisé." });
    }

    const hash  = crypto.createHash("sha256").update(password).digest("hex");
    const today = new Date().toISOString().slice(0, 10);

    await db.query(`
      INSERT INTO Clients
        (Nom, Prenom, Email, Telephone, Adresse, Ville, CodePostal, Pays, Date_inscription, Mot_de_passe)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nom, prenom, email, telephone, adresse, ville, codepostal, pays, today, hash]);

    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.render("pages/register", { title: "Inscription", error: "Erreur serveur." });
  }
});

// ------------------
// Dashboard - Accueil
// ------------------

app.get("/dashboard", requireGestionnaire, async (req, res) => {
  try {
    const [produits]      = await db.query("SELECT COUNT(*) AS total FROM Produits");
    const [clients]       = await db.query("SELECT COUNT(*) AS total FROM Clients");
    const [commandes]     = await db.query("SELECT COUNT(*) AS total FROM Commande");
    const [faibleStock]   = await db.query("SELECT COUNT(*) AS total FROM Stock WHERE Quantite <= 5");
    const [gestionnaires] = await db.query("SELECT COUNT(*) AS total FROM Gestionnaires");

    res.render("pages/dashboard/index", {
      title: "Dashboard",
      stats: {
        produits:      produits[0].total,
        clients:       clients[0].total,
        commandes:     commandes[0].total,
        faibleStock:   faibleStock[0].total,
        gestionnaires: gestionnaires[0].total,
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
    const [produits] = await db.query(`
      SELECT p.*, c.nom AS categorie, s.Quantite AS stock
      FROM Produits p
      JOIN Categories c ON p.ID_categorie = c.ID_categorie
      LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
      ORDER BY c.nom, p.Nom_produit
    `);
    res.render("pages/dashboard/produits", { title: "Produits", produits });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.get("/dashboard/produits/ajouter", requireGestionnaire, async (req, res) => {
  const [categories] = await db.query("SELECT * FROM Categories ORDER BY nom");
  res.render("pages/dashboard/produit-form", {
    title: "Ajouter un produit", produit: null, categories, error: null
  });
});

app.post("/dashboard/produits/ajouter", requireGestionnaire, async (req, res) => {
  const { Reference, Nom_produit, Prix, Taille_produit, ID_categorie, Quantite } = req.body;
  const [categories] = await db.query("SELECT * FROM Categories ORDER BY nom");

  if (!Reference || !Nom_produit || !Prix || !ID_categorie) {
    return res.render("pages/dashboard/produit-form", {
      title: "Ajouter un produit", produit: req.body, categories,
      error: "Tous les champs obligatoires doivent être remplis."
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT ID_produit FROM Produits WHERE Reference = ?", [Reference]
    );
    if (existing.length) {
      return res.render("pages/dashboard/produit-form", {
        title: "Ajouter un produit", produit: req.body, categories,
        error: "Cette référence existe déjà."
      });
    }

    const [result] = await db.query(`
      INSERT INTO Produits (Reference, Nom_produit, Prix, Taille_produit, ID_categorie)
      VALUES (?, ?, ?, ?, ?)
    `, [Reference, Nom_produit, parseFloat(Prix), Taille_produit, parseInt(ID_categorie)]);

    const today = new Date().toISOString().slice(0, 10);
    await db.query(
      "INSERT INTO Stock (Quantite, Date_derniere_maj, ID_produit) VALUES (?, ?, ?)",
      [parseInt(Quantite) || 0, today, result.insertId]
    );

    res.redirect("/dashboard/produits");
  } catch (err) {
    console.error(err);
    res.render("pages/dashboard/produit-form", {
      title: "Ajouter un produit", produit: req.body, categories, error: "Erreur serveur."
    });
  }
});

app.get("/dashboard/produits/modifier/:id", requireGestionnaire, async (req, res) => {
  const [rows] = await db.query(`
    SELECT p.*, s.Quantite AS stock
    FROM Produits p
    LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
    WHERE p.ID_produit = ?
  `, [req.params.id]);

  if (!rows.length) return res.redirect("/dashboard/produits");

  const [categories] = await db.query("SELECT * FROM Categories ORDER BY nom");
  res.render("pages/dashboard/produit-form", {
    title: "Modifier le produit", produit: rows[0], categories, error: null
  });
});

app.post("/dashboard/produits/modifier/:id", requireGestionnaire, async (req, res) => {
  const { Nom_produit, Prix, Taille_produit, ID_categorie, Quantite } = req.body;
  const [categories] = await db.query("SELECT * FROM Categories ORDER BY nom");

  if (!Nom_produit || !Prix || !ID_categorie) {
    return res.render("pages/dashboard/produit-form", {
      title: "Modifier le produit",
      produit: { ...req.body, ID_produit: req.params.id },
      categories, error: "Tous les champs obligatoires doivent être remplis."
    });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    await db.query(`
      UPDATE Produits SET Nom_produit = ?, Prix = ?, Taille_produit = ?, ID_categorie = ?
      WHERE ID_produit = ?
    `, [Nom_produit, parseFloat(Prix), Taille_produit, parseInt(ID_categorie), req.params.id]);

    await db.query(
      "UPDATE Stock SET Quantite = ?, Date_derniere_maj = ? WHERE ID_produit = ?",
      [parseInt(Quantite) || 0, today, req.params.id]
    );

    res.redirect("/dashboard/produits");
  } catch (err) {
    console.error(err);
    res.render("pages/dashboard/produit-form", {
      title: "Modifier le produit",
      produit: { ...req.body, ID_produit: req.params.id },
      categories, error: "Erreur serveur."
    });
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
    const [commandes] = await db.query(`
      SELECT c.*, cl.Nom, cl.Prenom
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      ORDER BY c.Date_commande DESC
    `);
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
    const [faibleStock] = await db.query(`
      SELECT p.Nom_produit, s.Quantite
      FROM Stock s
      JOIN Produits p ON s.ID_produit = p.ID_produit
      WHERE s.Quantite <= 5
      ORDER BY s.Quantite ASC
    `);

    const [plusVendus] = await db.query(`
      SELECT p.Nom_produit, SUM(v.Quantite) AS total_vendu
      FROM Vendu v
      JOIN Produits p ON v.ID_produit = p.ID_produit
      GROUP BY p.ID_produit
      ORDER BY total_vendu DESC
      LIMIT 5
    `);

    const [clientsFideles] = await db.query(`
      SELECT cl.Nom, cl.Prenom, COUNT(c.ID_commande) AS nb_commandes
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      GROUP BY c.ID_client
      ORDER BY nb_commandes DESC
      LIMIT 5
    `);

    const [clientsAnnulations] = await db.query(`
      SELECT cl.Nom, cl.Prenom, COUNT(c.ID_commande) AS nb_annulations
      FROM Commande c
      JOIN Clients cl ON c.ID_client = cl.ID_client
      WHERE c.Statut_commande = 'Annulée'
      GROUP BY c.ID_client
      ORDER BY nb_annulations DESC
      LIMIT 5
    `);

    res.render("pages/dashboard/rapports", {
      title: "Rapports", faibleStock, plusVendus, clientsFideles, clientsAnnulations,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

// ------------------
// Dashboard - Gestionnaires
// ------------------

app.get("/dashboard/gestionnaires", requireGestionnaire, async (req, res) => {
  const [gestionnaires] = await db.query("SELECT * FROM Gestionnaires ORDER BY Nom");
  res.render("pages/dashboard/gestionnaires", {
    title: "Gestionnaires", gestionnaires, success: req.query.success || null
  });
});

app.get("/dashboard/gestionnaires/ajouter", requireGestionnaire, (req, res) => {
  res.render("pages/dashboard/gestionnaire-form", {
    title: "Ajouter un gestionnaire", error: null
  });
});

app.post("/dashboard/gestionnaires/ajouter", requireGestionnaire, async (req, res) => {
  const { nom, prenom, email, password, password_confirm, role } = req.body;

  if (!nom || !prenom || !email || !password || !role) {
    return res.render("pages/dashboard/gestionnaire-form", {
      title: "Ajouter un gestionnaire", error: "Tous les champs sont obligatoires."
    });
  }

  if (password !== password_confirm) {
    return res.render("pages/dashboard/gestionnaire-form", {
      title: "Ajouter un gestionnaire", error: "Les mots de passe ne correspondent pas."
    });
  }

  try {
    const [existing] = await db.query(
      "SELECT Id FROM Gestionnaires WHERE Email = ?", [email]
    );
    if (existing.length) {
      return res.render("pages/dashboard/gestionnaire-form", {
        title: "Ajouter un gestionnaire", error: "Un gestionnaire avec cet email existe déjà."
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    await db.query(`
      INSERT INTO Gestionnaires (Nom, Prenom, Email, Mot_de_passe, Role, Date_de_creation)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nom, prenom, email, password, role, today]);

    res.redirect("/dashboard/gestionnaires?success=1");
  } catch (err) {
    console.error(err);
    res.render("pages/dashboard/gestionnaire-form", {
      title: "Ajouter un gestionnaire", error: "Erreur serveur."
    });
  }
});

app.post("/dashboard/gestionnaires/supprimer/:id", requireGestionnaire, async (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    return res.redirect("/dashboard/gestionnaires");
  }
  await db.query("DELETE FROM Gestionnaires WHERE Id = ?", [req.params.id]);
  res.redirect("/dashboard/gestionnaires");
});

// ------------------
// Espace client
// ------------------

app.get("/espace-client", requireClient, async (req, res) => {
  try {
    const [commandes] = await db.query(`
      SELECT c.ID_commande, c.Date_commande, c.Statut_commande,
             COALESCE(SUM(v.Quantite), 0) AS nb_produits
      FROM Commande c
      LEFT JOIN Vendu v ON v.ID_commande = c.ID_commande
      WHERE c.ID_client = ?
      GROUP BY c.ID_commande
      ORDER BY c.Date_commande DESC
    `, [req.session.user.id]);

    res.render("pages/client/index", { title: "Mon espace", commandes });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.get("/espace-client/commande/:id", requireAuth, async (req, res) => {
  try {
    const [commande] = await db.query(
      "SELECT * FROM Commande WHERE ID_commande = ? AND ID_client = ?",
      [req.params.id, req.session.user.id]
    );

    if (!commande.length) {
      return res.status(404).render("pages/404", { title: "Introuvable" });
    }

    const [produits] = await db.query(`
      SELECT p.Nom_produit, p.Prix, v.Quantite,
             (p.Prix * v.Quantite) AS sous_total
      FROM Vendu v
      JOIN Produits p ON v.ID_produit = p.ID_produit
      WHERE v.ID_commande = ?
    `, [req.params.id]);

    const total = produits.reduce((sum, p) => sum + Number(p.sous_total || 0), 0);

    res.render("pages/client/commande", {
      title: `Commande #${req.params.id}`, commande: commande[0], produits, total,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.post("/espace-client/commande/:id/annuler", requireClient, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT Statut_commande FROM Commande WHERE ID_commande = ? AND ID_client = ?",
      [req.params.id, req.session.user.id]
    );

    if (!rows.length) return res.redirect("/espace-client");
    if (rows[0].Statut_commande !== "En cours") {
      return res.redirect(`/espace-client/commande/${req.params.id}`);
    }

    await db.query(
      "UPDATE Commande SET Statut_commande = 'Annulée' WHERE ID_commande = ? AND ID_client = ?",
      [req.params.id, req.session.user.id]
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
  const devise  = req.query.devise || "euros";
  res.redirect(`/dab/${devise}/${montant}`);
});

app.get("/dab/:devise/:montant", (req, res) => {
  const montant = parseFloat(req.params.montant);
  const devise  = req.params.devise;

  if (isNaN(montant) || montant <= 0) {
    return res.render("pages/dab-result", {
      title: "DAB", montant: req.params.montant, devise, repartition: [], plusPetite: null,
    });
  }

  const { repartition, plusPetite } = calculerCoupures(montant, devise);
  res.render("pages/dab-result", {
    title: `DAB - ${montant} ${devise}`, montant, devise, repartition, plusPetite,
  });
});

// ------------------
// Erreurs
// ------------------

app.get("/erreur", (req, res) => {
  res.render("pages/error", { title: "Erreur" });
});

// 404 
app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page introuvable" });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});