const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = 8080;

// Fichiers statiques (CSS, images, JS)
app.use(express.static(path.join(__dirname, "public")));

// Lecture des données envoyées en POST
app.use(express.urlencoded({ extended: true }));

// Configuration des sessions
app.use(
  session({
    secret: "monSuperSecretChangeLe",
    resave: false,
    saveUninitialized: false,
  })
);

// Moteur de templates
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rendre la session accessible dans les vues
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.login = req.session.login || null;
  next();
});

// Accueil
app.get("/", (req, res) => {
  res.render("pages/index", { title: "Accueil" });
});

// 404
app.use((req, res) => {
  res.status(404).send("Page non trouvée");
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
