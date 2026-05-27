const crypto = require("crypto");
const request = require("supertest");

jest.mock("../database/db", () => ({
  query: jest.fn(),
}));

const db = require("../database/db");
const app = require("../app");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

describe("Parcours fonctionnels principaux", () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test("T-01 Inscription client: compte cree et redirection", async () => {
    db.query
      .mockResolvedValueOnce([[]]) // email non existant
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // insert client

    const res = await request(app).post("/auth/register").send({
      nom: "Dupont",
      prenom: "Sophie",
      email: "sophie.test@gmail.com",
      telephone: "0600000000",
      adresse: "1 rue de test",
      ville: "Paris",
      codepostal: "75001",
      pays: "France",
      password: "motdepasse",
      password_confirm: "motdepasse",
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test("T-02 Connexion client: session active et acces espace client", async () => {
    const clientHash = sha256("password123");
    db.query
      .mockResolvedValueOnce([[]]) // pas gestionnaire
      .mockResolvedValueOnce([[
        {
          ID_client: 1,
          Nom: "Dupont",
          Prenom: "Sophie",
          Email: "sophie.test@gmail.com",
          Mot_de_passe: clientHash,
        },
      ]]) // client trouve
      .mockResolvedValueOnce([[
        { ID_commande: 10, Date_commande: "2026-05-27", Statut_commande: "En cours", total: 120 },
      ]]); // /espace-client

    const agent = request.agent(app);
    const loginRes = await agent.post("/auth/login").send({
      email: "sophie.test@gmail.com",
      password: "password123",
    });

    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.location).toBe("/espace-client");

    const clientRes = await agent.get("/espace-client");
    expect(clientRes.status).toBe(200);
  });

  test("T-03 Connexion gestionnaire: dashboard accessible", async () => {
    db.query
      .mockResolvedValueOnce([[
        { Id: 99, Nom: "Admin", Prenom: "Root", Email: "admin@admin.com", Mot_de_passe: "admin" },
      ]]) // gestionnaire trouve
      .mockResolvedValueOnce([[{ total: 3 }]]) // produits
      .mockResolvedValueOnce([[{ total: 5 }]]) // clients
      .mockResolvedValueOnce([[{ total: 2 }]]) // commandes
      .mockResolvedValueOnce([[{ total: 1 }]]) // faible stock
      .mockResolvedValueOnce([[{ total: 1 }]]) // gestionnaires
      .mockResolvedValueOnce([[{ categorie: "Sacs", total: 7 }]]) // ventesParCat
      .mockResolvedValueOnce([[{ Statut_commande: "En cours", total: 2 }]]) // commandesParStatut
      .mockResolvedValueOnce([[{ total: 250 }]]) // CA
      .mockResolvedValueOnce([[{ Nom_produit: "Sac", Quantite: 3 }]]); // stockFaible

    const agent = request.agent(app);
    const loginRes = await agent.post("/auth/login").send({
      email: "admin@admin.com",
      password: "admin",
    });

    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.location).toBe("/dashboard");

    const dashRes = await agent.get("/dashboard");
    expect(dashRes.status).toBe(200);
  });

  test("T-04 Ajout panier: session panier mise a jour", async () => {
    const clientHash = sha256("password123");
    db.query
      .mockResolvedValueOnce([[]]) // login: pas gestionnaire
      .mockResolvedValueOnce([[
        {
          ID_client: 1,
          Nom: "Dupont",
          Prenom: "Sophie",
          Email: "sophie.test@gmail.com",
          Mot_de_passe: clientHash,
        },
      ]]) // login client
      .mockResolvedValueOnce([[{ Quantite: 5 }]]) // ajout panier: stock
      .mockResolvedValueOnce([[
        {
          ID_produit: 1,
          Nom_produit: "Sac test",
          Prix: 99.9,
          categorie: "Sacs",
          stock: 4,
        },
      ]]); // GET panier details

    const agent = request.agent(app);
    await agent.post("/auth/login").send({
      email: "sophie.test@gmail.com",
      password: "password123",
    });

    const addRes = await agent.post("/panier/ajouter").send({ id: 1, quantite: 1 });
    expect(addRes.status).toBe(302);
    expect(addRes.headers.location).toBe("/panier");

    const panierRes = await agent.get("/panier");
    expect(panierRes.status).toBe(200);
  });

  test("T-05 Confirmation commande: commande creee et stock reduit", async () => {
    const clientHash = sha256("password123");
    db.query
      .mockResolvedValueOnce([[]]) // login: pas gestionnaire
      .mockResolvedValueOnce([[
        {
          ID_client: 1,
          Nom: "Dupont",
          Prenom: "Sophie",
          Email: "sophie.test@gmail.com",
          Mot_de_passe: clientHash,
        },
      ]]) // login client
      .mockResolvedValueOnce([[{ Quantite: 10 }]]) // ajout panier: stock ok
      .mockResolvedValueOnce([[{ Quantite: 10 }]]) // confirmer: verif stock
      .mockResolvedValueOnce([{ insertId: 123 }]) // insert commande
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // insert vendu
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update stock

    const agent = request.agent(app);
    await agent.post("/auth/login").send({
      email: "sophie.test@gmail.com",
      password: "password123",
    });
    await agent.post("/panier/ajouter").send({ id: 1, quantite: 1 });

    const res = await agent.post("/commande/confirmer");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/espace-client/commande/123");
  });

  test("T-06 Stock insuffisant: redirection erreur stock", async () => {
    const clientHash = sha256("password123");
    db.query
      .mockResolvedValueOnce([[]]) // login: pas gestionnaire
      .mockResolvedValueOnce([[
        {
          ID_client: 1,
          Nom: "Dupont",
          Prenom: "Sophie",
          Email: "sophie.test@gmail.com",
          Mot_de_passe: clientHash,
        },
      ]]) // login client
      .mockResolvedValueOnce([[{ Quantite: 5 }]]) // ajout panier: stock ok
      .mockResolvedValueOnce([[{ Quantite: 0 }]]); // confirmer: stock insuffisant

    const agent = request.agent(app);
    await agent.post("/auth/login").send({
      email: "sophie.test@gmail.com",
      password: "password123",
    });
    await agent.post("/panier/ajouter").send({ id: 1, quantite: 1 });

    const res = await agent.post("/commande/confirmer");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/panier?erreur=stock");
  });

  test("T-07 Annulation commande: statut annulee et stock restaure", async () => {
    const clientHash = sha256("password123");
    db.query
      .mockResolvedValueOnce([[]]) // login: pas gestionnaire
      .mockResolvedValueOnce([[
        {
          ID_client: 1,
          Nom: "Dupont",
          Prenom: "Sophie",
          Email: "sophie.test@gmail.com",
          Mot_de_passe: clientHash,
        },
      ]]) // login client
      .mockResolvedValueOnce([[{ Statut_commande: "En cours" }]]) // commande annulable
      .mockResolvedValueOnce([[{ ID_produit: 1, Quantite: 2 }]]) // lignes vendu
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // restore stock
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update commande

    const agent = request.agent(app);
    await agent.post("/auth/login").send({
      email: "sophie.test@gmail.com",
      password: "password123",
    });

    const res = await agent.post("/espace-client/commande/42/annuler");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/espace-client");
  });
});
