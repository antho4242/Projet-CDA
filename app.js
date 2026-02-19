const express = require("express");
const path    = require("path");
const session = require("express-session");
require("dotenv").config();
const apiRouter = require("./routes/api");

const { calculerCoupures } = require("./modules/dab");

const app  = express();
const PORT = 8080;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api", apiRouter);

app.use(session({
  secret: "monSuperSecretChangeLe",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.login   = req.session.login   || null;
  next();
});

// --- Accueil ---
app.get("/", (req, res) => {
  res.render("pages/index", { title: "Accueil" });
});

// --- Auth ---
app.get("/auth/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/");
  res.render("pages/login", { title: "Connexion", error: null });
});

app.post("/auth/login", (req, res) => {
  const { login, password } = req.body;
  if (login === "admin" && password === "admin") {
    req.session.isAdmin = true;
    req.session.login   = login;
    return res.redirect("/");
  }
  res.render("pages/login", { title: "Connexion", error: "Identifiants incorrects" });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
}); 

//  DAB formulaire
app.get("/dab", (req, res) => {
  if (!req.query.montant) {
    return res.render("pages/dab", { title: "DAB" });
  }
  const montant = parseFloat(req.query.montant);
  const devise  = req.query.devise || "euros";
  res.redirect(`/dab/${devise}/${montant}`);
});

// DAB route
app.get("/dab/:devise/:montant", (req, res) => {
  const montant = parseFloat(req.params.montant);
  const devise  = req.params.devise;

  if (isNaN(montant) || montant <= 0) {
    return res.render("pages/dab-result", {
      title: "DAB - Résultat",
      montant: req.params.montant,
      devise,
      repartition: [],
      plusPetite: null
    });
  }

  const { repartition, plusPetite } = calculerCoupures(montant, devise);
  res.render("pages/dab-result", { title: `DAB - ${montant} ${devise}`, montant, devise, repartition, plusPetite });
});

// Boutique
app.get("/boutique", (req, res) => {
  res.render("pages/boutique", { title: "Boutique" });
});

app.get("/boutique/produit/:id", (req, res) => {
  res.render("pages/produit", { title: "Produit", produitId: req.params.id });
});

//Erreur volontaire
app.get("/erreur", (req, res) => {
  res.render("pages/error", { title: "Erreur" });
});

//  404 
app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page introuvable" });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});