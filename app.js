const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = 8080;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "monSuperSecretChangeLe",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rendre certaines infos dispo dans toutes les vues
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.login = req.session.login || null;
  next();
});

// Page d'accueil
app.get("/", (req, res) => {
  res.render("pages/index", { title: "Accueil" });
});

// Connexion
app.get("/auth/login", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/");
  }
  res.render("pages/login", { title: "Connexion", error: null });
});

app.post("/auth/login", (req, res) => {
  const login = req.body.login;
  const password = req.body.password;

  if (login === "admin" && password === "admin") {
    req.session.isAdmin = true;
    req.session.login = login;
    return res.redirect("/");
  }

  res.render("pages/login", {
    title: "Connexion",
    error: "Identifiants incorrects"
  });
});

// Déconnexion
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// 404
app.use((req, res) => {
  res.status(404).send("Page non trouvée");
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
