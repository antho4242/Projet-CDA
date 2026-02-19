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
