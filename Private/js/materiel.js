let materiel = [];

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

function afficherFilter() {
    // Filtre salles
    const selectSalle = document.getElementById("roomFilter");
    selectSalle.innerHTML = `<option value="">Toutes les salles</option>`;
    const sallesUniques = new Set();
    materiel.forEach(ele => sallesUniques.add(ele.salle));
    sallesUniques.forEach(salle => {
        selectSalle.innerHTML += `<option value="${salle}">${salle}</option>`;
    });

    // Filtre types  ← NOUVEAU
    const selectType = document.getElementById("typeFilter");
    selectType.innerHTML = `<option value="">Tous les types</option>`;
    const typesUniques = new Set();
    materiel.forEach(ele => typesUniques.add(ele.type_materiel));
    typesUniques.forEach(type => {
        selectType.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

document.getElementById("roomFilter").addEventListener("change", filtrer);
document.getElementById("typeFilter").addEventListener("change", filtrer);  // ← MODIFIÉ

function filtrer() {
    const salle = document.getElementById("roomFilter").value;
    const type = document.getElementById("typeFilter").value;  // ← MODIFIÉ
    afficherMateriel(salle, type);
}

function afficherMateriel(filtreSalle = "", filtreType = "") {  // ← MODIFIÉ
    document.getElementById("roomsContainer").innerHTML = "";

    const materielFiltres = materiel.filter(ele => {
        let okSalle = filtreSalle === "" || ele.salle === filtreSalle;
        let okType = filtreType === "" || ele.type_materiel === filtreType;  // ← MODIFIÉ
        return okSalle && okType;
    });

    materielFiltres.forEach((ele) => {
        // Classe CSS du badge selon le type  ← NOUVEAU
        const typeLower = ele.type_materiel?.toLowerCase() || "";
        let badgeClass = "status-fonctionnel";
        if (typeLower.includes("imprimante")) badgeClass = "status-reparation";
        else if (typeLower.includes("projecteur") || typeLower.includes("vidéo")) badgeClass = "status-panne";

        document.getElementById("roomsContainer").innerHTML += `
            <div class="col-md-6 col-lg-3" data-aos="fade-up">
                <div class="material-card">
                    <div class="material-image">
                        <img src="${ele.img}" alt="${ele.nom_materiel}">
                        <span class="status-badge ${badgeClass}">${ele.type_materiel}</span>
                        <span class="room-badge">${ele.salle}</span>
                    </div>
                    <div class="material-content">
                        <span class="type-badge">${ele.type_materiel}</span>
                        <h3 class="material-name">${ele.nom_materiel}</h3>
                        <p class="material-quantity">Quantité: <span>${ele.quantite}</span></p>
                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${ele.Remarques}</div>
                        </div>
                        <button class="btn-details btn-delete" onclick="suprimer(${ele.id_materiel})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

getNombreInfoMateriel();

async function suprimer(x) {
    console.log(x);
    try {
        await fetch('/materiel/supprimer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: x })
        });
        window.location.reload();
    } catch (err) {
        console.error("Erreur réseau :", err);
    }
}