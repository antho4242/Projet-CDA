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
// Helper date 
// ------------------
function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
      [nom, prenom, email, telephone, adresse, ville, codepostal, pays, today, hash]
    );

    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.render("pages/register", { title: "Inscription", error: "Erreur serveur." });
  }
});

// ------------------
// Dashboard gestionnaire
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

    const total = produits.reduce(
      (sum, p) => sum + parseFloat(p.sous_total),
      0
    );

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

app.get("/erreur", (req, res) => {
  res.render("pages/error", { title: "Erreur" });
});

app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page introuvable" });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});