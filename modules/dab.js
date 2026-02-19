/**
 * Module DAB — Calcul de répartition en coupures
 * Supporte euros et dollars
 */

// Coupures disponibles par devise
const COUPURES = {
  euros:   [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01],
  dollars: [100, 50, 20, 10, 5, 2, 1, 0.50, 0.25, 0.10, 0.05]
};

/**
 * Calcule la répartition d'un montant en coupures
 * @param {number} montant 
 * @param {string} devise  "euros" | "dollars"
 * @returns {{ repartition: Array<{coupure, quantite}>, plusPetite: number|null }}
 */
function calculerCoupures(montant, devise) {
  const coupures = COUPURES[devise];
  if (!coupures) throw new Error(`Devise inconnue : ${devise}`);

  let reste = Math.round(montant * 100) / 100; 
  const repartition = [];
  let plusPetite = null;

  for (const coupure of coupures) {
    const quantite = Math.floor(Math.round(reste / coupure * 100) / 100);
    if (quantite > 0) {
      repartition.push({ coupure, quantite });
      plusPetite = coupure;
      reste = Math.round((reste - quantite * coupure) * 100) / 100;
    }
  }

  return { repartition, plusPetite };
}

module.exports = { calculerCoupures, COUPURES };