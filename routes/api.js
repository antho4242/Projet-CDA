const express = require("express");
const router = express.Router();
const db = require("../database/db");

// Produits (option : filtre par catégorie via ?categorie=...)
router.get("/produits", async (req, res) => {
  try {
    let sql = `
      SELECT p.ID_produit, p.Reference, p.Nom_produit, p.Prix,
             p.Taille_produit, c.nom AS categorie,
             s.Quantite AS stock
      FROM Produits p
      JOIN Categories c ON p.ID_categorie = c.ID_categorie
      LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
    `;
    const params = [];

    if (req.query.categorie) {
      sql += " WHERE c.nom = ?";
      params.push(req.query.categorie);
    }

    sql += " ORDER BY c.nom, p.Nom_produit";
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Détail produit
router.get("/produits/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT p.*, c.nom AS categorie, s.Quantite AS stock
      FROM Produits p
      JOIN Categories c ON p.ID_categorie = c.ID_categorie
      LEFT JOIN Stock s ON s.ID_produit = p.ID_produit
      WHERE p.ID_produit = ?
      `,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: "Produit introuvable" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catégories
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Categories ORDER BY nom");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Création produit
router.post("/produits", async (req, res) => {
  try {
    const { Reference, Nom_produit, Prix, Taille_produit, ID_categorie } = req.body;

    if (!Reference || !Nom_produit || !Prix || !ID_categorie) {
      return res.status(400).json({
        error: "Champs obligatoires : Reference, Nom_produit, Prix, ID_categorie"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO Produits (Reference, Nom_produit, Prix, Taille_produit, ID_categorie)
      VALUES (?, ?, ?, ?, ?)
      `,
      [Reference, Nom_produit, Number(Prix), Taille_produit || null, Number(ID_categorie)]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mise à jour produit
router.put("/produits/:id", async (req, res) => {
  try {
    const { Nom_produit, Prix, Taille_produit, ID_categorie } = req.body;

    const [existing] = await db.query(
      "SELECT 1 FROM Produits WHERE ID_produit = ?",
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: "Produit introuvable" });

    await db.query(
      `
      UPDATE Produits
      SET Nom_produit = ?, Prix = ?, Taille_produit = ?, ID_categorie = ?
      WHERE ID_produit = ?
      `,
      [Nom_produit, Number(Prix), Taille_produit || null, Number(ID_categorie), req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression produit
router.delete("/produits/:id", async (req, res) => {
  try {
    const [existing] = await db.query(
      "SELECT 1 FROM Produits WHERE ID_produit = ?",
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: "Produit introuvable" });

    await db.query("DELETE FROM Produits WHERE ID_produit = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
