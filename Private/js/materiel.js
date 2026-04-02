let materiel = [];
let sallesDisponibles = [];

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

async function chargerSallesDisponibles() {
    try {
        const response = await fetch('/Salles/Info');
        const data = await response.json();
        sallesDisponibles = Array.isArray(data.salles) ? data.salles : [];
        remplirSelectSallesEdition();
    } catch (err) {
        console.error('Erreur chargement salles :', err);
    }
}

function remplirSelectSallesEdition() {
    const select = document.getElementById('editSalleMateriel');
    if (!select) return;

    select.innerHTML = '';
    sallesDisponibles.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.nom_salle;
        opt.textContent = s.nom_salle;
        select.appendChild(opt);
    });
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
                        <div class="d-flex gap-2">
                            <button class="btn-details" onclick='ouvrirModalEdition(${JSON.stringify(ele).replace(/'/g, "&#39;")})'>
                                <i class="fas fa-pen"></i> Modifier
                            </button>
                            <button class="btn-details btn-delete" onclick="suprimer(${ele.id_materiel})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

getNombreInfoMateriel();
chargerSallesDisponibles();

function ouvrirModalEdition(item) {
    document.getElementById('editMaterielId').value = item.id_materiel;
    document.getElementById('editNomMateriel').value = item.nom_materiel || '';
    document.getElementById('editTypeMateriel').value = item.type_materiel || 'Autre';
    document.getElementById('editQuantiteMateriel').value = item.quantite || 0;
    document.getElementById('editEtatMateriel').value = item.etat || 'Disponible';
    document.getElementById('editRemarquesMateriel').value = item.Remarques || '';
    const editImageInput = document.getElementById('editImageMateriel');
    if (editImageInput) editImageInput.value = '';

    const salleSelect = document.getElementById('editSalleMateriel');
    if (salleSelect) {
        const exists = Array.from(salleSelect.options).some(o => o.value === item.salle);
        if (!exists && item.salle) {
            const opt = document.createElement('option');
            opt.value = item.salle;
            opt.textContent = item.salle;
            salleSelect.appendChild(opt);
        }
        salleSelect.value = item.salle || '';
    }

    new bootstrap.Modal(document.getElementById('editMaterielModal')).show();
}

document.getElementById('btnSaveEditMateriel')?.addEventListener('click', async () => {
    const id = document.getElementById('editMaterielId').value;
    const payload = {
        nom_materiel: document.getElementById('editNomMateriel').value,
        type_materiel: document.getElementById('editTypeMateriel').value,
        quantite: document.getElementById('editQuantiteMateriel').value,
        etat: document.getElementById('editEtatMateriel').value,
        salle: document.getElementById('editSalleMateriel').value,
        Remarques: document.getElementById('editRemarquesMateriel').value,
    };
    const imageFile = document.getElementById('editImageMateriel')?.files?.[0] || null;

    if (!payload.nom_materiel || !payload.type_materiel || !payload.salle) {
        alert('Veuillez remplir les champs obligatoires');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('nom_materiel', payload.nom_materiel);
        formData.append('type_materiel', payload.type_materiel);
        formData.append('quantite', payload.quantite);
        formData.append('etat', payload.etat);
        formData.append('salle', payload.salle);
        formData.append('Remarques', payload.Remarques || '');
        if (imageFile) formData.append('image_materiel', imageFile);

        const res = await fetch(`/materiel/${id}`, {
            method: 'PUT',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Erreur modification' }));
            alert(err.message || 'Erreur modification');
            return;
        }

        bootstrap.Modal.getInstance(document.getElementById('editMaterielModal'))?.hide();
        await getNombreInfoMateriel();
    } catch (err) {
        console.error('Erreur modification matériel :', err);
        alert('Erreur réseau lors de la modification');
    }
});

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