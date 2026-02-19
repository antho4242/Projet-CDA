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

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "monSuperSecretChangeLe",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/api", apiRouter);

// Infos utilisateur dispo dans les vues
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === "gestionnaire";
  res.locals.login = req.session.user?.prenom || null;
  next();
});

// Middlewares de protection
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

// Accueil
app.get("/", (req, res) => {
  res.render("pages/index", { title: "Accueil" });
});

// Catalogue
app.get("/boutique", (req, res) => {
  res.render("pages/boutique", { title: "Boutique" });
});

app.get("/boutique/produit/:id", (req, res) => {
  res.render("pages/produit", {
    title: "Produit",
    produitId: req.params.id
  });
});

// Auth
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
        return res.render("pages/login", { title: "Connexion", error: "Mot de passe incorrect." });
      }

      req.session.user = {
        id: m.Id,
        nom: m.Nom,
        prenom: m.Prenom,
        email: m.Email,
        role: "gestionnaire"
      };

      return res.redirect("/dashboard");
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");

    const [clients] = await db.query(
      "SELECT * FROM Clients WHERE Email = ?",
      [email]
    );

    if (!clients.length) {
      return res.render("pages/login", { title: "Connexion", error: "Compte introuvable." });
    }

    const c = clients[0];

    if (c.Mot_de_passe !== hash) {
      return res.render("pages/login", { title: "Connexion", error: "Mot de passe incorrect." });
    }

    req.session.user = {
      id: c.ID_client,
      nom: c.Nom,
      prenom: c.Prenom,
      email: c.Email,
      role: "client"
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
    nom, prenom, email, telephone,
    adresse, ville, codepostal, pays,
    password, password_confirm
  } = req.body;

  if (password !== password_confirm) {
    return res.render("pages/register", {
      title: "Inscription",
      error: "Les mots de passe ne correspondent pas."
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
        error: "Email déjà utilisé."
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
      [nom, prenom, email, telephone, adresse, ville, codepostal, pays, today, hash]
    );

    res.redirect("/auth/login");

  } catch (err) {
    console.error(err);
    res.render("pages/register", { title: "Inscription", error: "Erreur serveur." });
  }
});

// Dashboard gestionnaire
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
        faibleStock: faibleStock[0].total
      }
    });
  } catch (err) {
    console.error(err);
    res.redirect("/erreur");
  }
});

app.get("/dashboard/produits", requireGestionnaire, async (req, res) => {
  const [produits] = await db.query(`
    SELECT p.*, c.nom AS categorie, s.Quantite AS stock
    FROM Produits p
    JOIN Categories c ON p.ID_categorie = c.ID_categorie
    LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
    ORDER BY c.nom, p.Nom_produit
  `);
  res.render("pages/dashboard/produits", { title: "Produits", produits });
});

app.post("/dashboard/produits/supprimer/:id", requireGestionnaire, async (req, res) => {
  await db.query("DELETE FROM Stock WHERE ID_produit = ?", [req.params.id]);
  await db.query("DELETE FROM Produits WHERE ID_produit = ?", [req.params.id]);
  res.redirect("/dashboard/produits");
});

app.get("/dashboard/clients", requireGestionnaire, async (req, res) => {
  const [clients] = await db.query("SELECT * FROM Clients ORDER BY Nom");
  res.render("pages/dashboard/clients", { title: "Clients", clients });
});

app.post("/dashboard/clients/supprimer/:id", requireGestionnaire, async (req, res) => {
  await db.query("DELETE FROM Clients WHERE ID_client = ?", [req.params.id]);
  res.redirect("/dashboard/clients");
});

app.get("/dashboard/commandes", requireGestionnaire, async (req, res) => {
  const [commandes] = await db.query(`
    SELECT c.*, cl.Nom, cl.Prenom
    FROM Commande c
    JOIN Clients cl ON c.ID_client = cl.ID_client
    ORDER BY c.Date_commande DESC
  `);
  res.render("pages/dashboard/commandes", { title: "Commandes", commandes });
});

app.post("/dashboard/commandes/statut/:id", requireGestionnaire, async (req, res) => {
  const { statut } = req.body;
  await db.query(
    "UPDATE Commande SET Statut_commande = ? WHERE ID_commande = ?",
    [statut, req.params.id]
  );
  res.redirect("/dashboard/commandes");
});

app.get("/dashboard/rapports", requireGestionnaire, async (req, res) => {
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
    title: "Rapports",
    faibleStock,
    plusVendus,
    clientsFideles,
    clientsAnnulations
  });
});

// DAB
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
      plusPetite: null
    });
  }

  const { repartition, plusPetite } = calculerCoupures(montant, devise);

  res.render("pages/dab-result", {
    title: `DAB - ${montant} ${devise}`,
    montant,
    devise,
    repartition,
    plusPetite
  });
});

// Page volontairement erronée
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
