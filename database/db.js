const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// Vérifie rapidement la connexion au lancement
pool.getConnection()
  .then(connection => {
    console.log("Connexion MySQL OK");
    connection.release();
  })
  .catch(err => {
    console.error("Erreur MySQL :", err.message);
  });

module.exports = pool;
