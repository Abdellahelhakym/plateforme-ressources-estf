// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES GLOBALES
// ─────────────────────────────────────────────────────────────────────────────
let materiel = [];

// ─────────────────────────────────────────────────────────────────────────────
// CHARGER LE MATÉRIEL
// ─────────────────────────────────────────────────────────────────────────────
async function getNombreInfoMateriel() {
    try {
        const response = await fetch('/materiel/Info');
        const data = await response.json();
        materiel = data.materiel;
        console.log(materiel);
        afficherFilter();
        afficherMateriel("", "");
    } catch (err) {
        console.error("Erreur lors du fetch :", err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────────────────────────────────────
function afficherFilter() {
    const selectSalle = document.getElementById("roomFilter");
    selectSalle.innerHTML = `<option value="">Toutes les salles</option>`;
    const sallesUniques = new Set();
    materiel.forEach(ele => sallesUniques.add(ele.salle));
    sallesUniques.forEach(salle => {
        selectSalle.innerHTML += `<option value="${salle}">${salle}</option>`;
    });

    const selectType = document.getElementById("typeFilter");
    selectType.innerHTML = `<option value="">Tous les types</option>`;
    const typesUniques = new Set();
    materiel.forEach(ele => typesUniques.add(ele.type_materiel));
    typesUniques.forEach(type => {
        selectType.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

document.getElementById("roomFilter").addEventListener("change", filtrer);
document.getElementById("typeFilter").addEventListener("change", filtrer);

function filtrer() {
    const salle = document.getElementById("roomFilter").value;
    const type  = document.getElementById("typeFilter").value;
    afficherMateriel(salle, type);
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFICHER LES CARTES (sans bouton Supprimer)
// ─────────────────────────────────────────────────────────────────────────────
function afficherMateriel(filtreSalle = "", filtreType = "") {
    document.getElementById("roomsContainer").innerHTML = "";

    const materielFiltres = materiel.filter(ele => {
        const okSalle = filtreSalle === "" || ele.salle === filtreSalle;
        const okType  = filtreType  === "" || ele.type_materiel === filtreType;
        return okSalle && okType;
    });

    if (materielFiltres.length === 0) {
        document.getElementById("roomsContainer").innerHTML = `
            <div class="col-12 text-center py-5" style="color:#9ca3af">
                <i class="fas fa-box-open" style="font-size:3rem;opacity:.35;display:block;margin-bottom:1rem"></i>
                <p style="font-size:1rem">Aucun matériel trouvé.</p>
            </div>`;
        return;
    }

    materielFiltres.forEach((ele) => {
        const typeLower = ele.type_materiel?.toLowerCase() || "";
        let badgeClass = "status-fonctionnel";
        if (typeLower.includes("imprimante"))                          badgeClass = "status-reparation";
        else if (typeLower.includes("projecteur") || typeLower.includes("vidéo")) badgeClass = "status-panne";

        // ✅ Pas de bouton Supprimer ni Modifier
        document.getElementById("roomsContainer").innerHTML += `
            <div class="col-md-6 col-lg-3" data-aos="fade-up">
                <div class="material-card">
                    <div class="material-image">
                        <img src="${ele.img || ''}" alt="${ele.nom_materiel}"
                             onerror="this.style.display='none'">
                        <span class="status-badge ${badgeClass}">${ele.type_materiel}</span>
                        <span class="room-badge">${ele.salle}</span>
                    </div>
                    <div class="material-content">
                        <span class="type-badge">${ele.type_materiel}</span>
                        <h3 class="material-name">${ele.nom_materiel}</h3>
                        <p class="material-quantity">Quantité : <span>${ele.quantite}</span></p>
                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${ele.Remarques || '—'}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
getNombreInfoMateriel();