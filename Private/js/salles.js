// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES GLOBALES
// ─────────────────────────────────────────────────────────────────────────────
let salles = [];

// ─────────────────────────────────────────────────────────────────────────────
// CHARGER LES SALLES
// ─────────────────────────────────────────────────────────────────────────────
async function getNombreInfoSalles() {
    try {
        const response = await fetch('/Salles/Info');
        const data = await response.json();

        salles = data.salles;
        console.log(salles);

        afficherFilter();
        afficherSalles("", "");

    } catch (err) {
        console.error("Erreur lors du fetch :", err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────────────────────────────────────
function afficherFilter() {
    salles.forEach(ele => {
        document.getElementById("roomFilter").innerHTML +=
            `<option>Salle ${ele.nom_salle}</option>`;
    });
}

document.getElementById("roomFilter").addEventListener("change", filtrer);
document.getElementById("typeFilter").addEventListener("change", filtrer);  // ✅ typeFilter

function filtrer() {
    const salle = document.getElementById("roomFilter").value;
    const type  = document.getElementById("typeFilter").value;  // ✅ type
    afficherSalles(salle, type);
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFICHER LES CARTES
// ─────────────────────────────────────────────────────────────────────────────
function afficherSalles(filtreSalle = "", filtreType = "") {   // ✅ filtreType
    document.getElementById("roomsContainer").innerHTML = "";

    const sallesFiltrees = salles.filter(ele => {
        const okSalle = filtreSalle === "" || "Salle " + ele.nom_salle === filtreSalle;
        const okType  = filtreType  === "" || ele.type_salle === filtreType;  // ✅ type_salle
        return okSalle && okType;
    });

    if (sallesFiltrees.length === 0) {
        document.getElementById("roomsContainer").innerHTML = `
            <div class="col-12 text-center py-5" style="color:#9ca3af">
                <i class="fas fa-door-closed" style="font-size:3rem;opacity:.35;display:block;margin-bottom:1rem"></i>
                <p style="font-size:1rem">Aucune salle trouvée.</p>
            </div>`;
        return;
    }

    const badgeClass = (etat) => {
        if (etat === 'Disponible')     return 'status-libre';
        if (etat === 'Occupée')        return 'status-occupee';
        if (etat === 'En Maintenance') return 'status-maintenance';
        return 'status-libre';
    };

    const imgHtml = (ele) => {
        if (ele.img) {
            return `<img src="${ele.img}" alt="Salle ${ele.nom_salle}">`;
        }
        return `<div style="width:100%;height:100%;
                    background:linear-gradient(135deg,#e3f2fd,#bbdefb);
                    display:flex;align-items:center;justify-content:center;
                    font-size:3.5rem;color:#2c75bd">
                    <i class="fas fa-door-open"></i>
                </div>`;
    };

    sallesFiltrees.forEach((ele) => {
        document.getElementById("roomsContainer").innerHTML += `
            <div class="col-md-6 col-lg-4" data-aos="fade-up">
                <div class="room-card">

                    <div class="room-image">
                        ${imgHtml(ele)}
                        <span class="status-badge ${badgeClass(ele.etat)}">${ele.etat}</span>
                    </div>

                    <div class="room-content">
                        <h3 class="room-title">Salle ${ele.nom_salle}</h3>

                        <div class="room-info">
                            <div class="info-label">Capacité</div>
                            <div class="info-value">${ele.capacite} personnes</div>
                        </div>
                        <div class="room-info">
                            <div class="info-label">Bâtiment</div>
                            <div class="info-value">${ele.batiment || '—'}</div>
                        </div>
                        <div class="room-info">
                            <div class="info-label">Type de salle</div>
                            <div class="info-value">${ele.type_salle}</div>
                        </div>

                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${ele.Remarques || '—'}</div>
                        </div>
                    </div>

                    <div class="room-actions">
                        <button class="btn-action btn-details"
                                onclick="ouvrirMateriel(${ele.id_salle}, '${ele.nom_salle}')">
                            <i class="fas fa-laptop"></i> Matériel
                        </button>
                        <button class="btn-action btn-modify"
                                onclick="ouvrirModifier(${ele.id_salle})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-action btn-delete"
                                onclick="suprimer(${ele.id_salle})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>

                </div>
            </div>`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPRIMER
// ─────────────────────────────────────────────────────────────────────────────
async function suprimer(x) {
    if (!confirm('Supprimer cette salle définitivement ?')) return;

    try {
        const resp   = await fetch('/Salles/supprimer', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id: x })
        });
        const result = await resp.json();

        if (result.success) {
            showToast('Salle supprimée avec succès.', 'success');
            salles = salles.filter(s => s.id_salle !== x);
            filtrer();
        } else {
            showToast('Erreur : ' + (result.message || 'Echec suppression'), 'error');
        }
    } catch (err) {
        console.error("Erreur réseau :", err);
        showToast('Erreur réseau.', 'error');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OUVRIR MODAL MODIFIER
// ─────────────────────────────────────────────────────────────────────────────
async function ouvrirModifier(id) {
    try {
        const resp = await fetch(`/Salles/${id}`);
        if (!resp.ok) throw new Error('Salle introuvable');
        const s = await resp.json();

        document.getElementById('mod_id').value        = s.id_salle;
        document.getElementById('mod_nom').value       = s.nom_salle    || '';
        document.getElementById('mod_batiment').value  = s.batiment     || '';
        document.getElementById('mod_type').value      = s.type_salle   || 'TP';
        document.getElementById('mod_capacite').value  = s.capacite     || '';
        document.getElementById('mod_etat').value      = s.etat         || 'Disponible';
        document.getElementById('mod_remarques').value = s.Remarques    || '';
        document.getElementById('mod_image').value     = '';

        const prev = document.getElementById('mod_img_preview');
        if (s.img) {
            prev.src           = s.img;
            prev.style.display = 'block';
        } else {
            prev.style.display = 'none';
        }

        openModal('modalModifier');
    } catch (e) {
        showToast('Erreur chargement : ' + e.message, 'error');
    }
}

document.getElementById('mod_image').addEventListener('change', function () {
    const file = this.files[0];
    const prev = document.getElementById('mod_img_preview');
    if (file) {
        prev.src           = URL.createObjectURL(file);
        prev.style.display = 'block';
    }
});

document.getElementById('formModifier').addEventListener('submit', async function (e) {
    e.preventDefault();

    const id  = document.getElementById('mod_id').value;
    const btn = document.getElementById('btnSauvegarder');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';

    try {
        const formData = new FormData();
        formData.append('nom_salle',  document.getElementById('mod_nom').value);
        formData.append('batiment',   document.getElementById('mod_batiment').value);
        formData.append('type_salle', document.getElementById('mod_type').value);
        formData.append('capacite',   document.getElementById('mod_capacite').value);
        formData.append('etat',       document.getElementById('mod_etat').value);
        formData.append('Remarques',  document.getElementById('mod_remarques').value);

        const imgFile = document.getElementById('mod_image').files[0];
        if (imgFile) formData.append('image_salle', imgFile);

        const resp   = await fetch(`/Salles/${id}`, { method: 'PUT', body: formData });
        const result = await resp.json();

        if (!resp.ok || !result.success) throw new Error(result.message || 'Erreur serveur');

        showToast('Salle modifiée avec succès !', 'success');
        closeModal('modalModifier');

        const idx = salles.findIndex(s => s.id_salle == id);
        if (idx !== -1) {
            salles[idx].nom_salle  = document.getElementById('mod_nom').value;
            salles[idx].batiment   = document.getElementById('mod_batiment').value;
            salles[idx].type_salle = document.getElementById('mod_type').value;
            salles[idx].capacite   = document.getElementById('mod_capacite').value;
            salles[idx].etat       = document.getElementById('mod_etat').value;
            salles[idx].Remarques  = document.getElementById('mod_remarques').value;
            if (result.img) salles[idx].img = result.img;
        }

        document.getElementById('roomFilter').innerHTML = '<option value="">Toutes les salles</option>';
        afficherFilter();
        filtrer();

    } catch (e) {
        showToast('Erreur : ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// OUVRIR MODAL MATÉRIEL
// ─────────────────────────────────────────────────────────────────────────────
async function ouvrirMateriel(id, nomSalle) {
    document.getElementById('modalMatTitle').textContent = `Matériel — Salle ${nomSalle}`;
    document.getElementById('modalMatBody').innerHTML =
        `<div class="text-center py-4">
            <i class="fas fa-spinner fa-spin me-2" style="color:#2c75bd;font-size:1.4rem"></i>
            Chargement...
         </div>`;
    openModal('modalMateriel');

    try {
        const resp = await fetch(`/Salles/materiel/${encodeURIComponent(nomSalle)}`);
        if (!resp.ok) throw new Error('Erreur serveur');
        const data = await resp.json();
        const mat  = data.materiel || [];

        if (!mat.length) {
            document.getElementById('modalMatBody').innerHTML = `
                <div class="text-center py-4" style="color:#9ca3af">
                    <i class="fas fa-box-open"
                       style="font-size:2.5rem;opacity:.35;display:block;margin-bottom:.8rem"></i>
                    Aucun matériel enregistré pour cette salle.
                </div>`;
            return;
        }

        const total  = mat.length;
        const dispo  = mat.filter(m => m.etat === 'Disponible').length;
        const occupe = mat.filter(m => m.etat === 'Occupee' || m.etat === 'Occupée').length;
        const maint  = mat.filter(m => m.etat === 'En Maintenance').length;

        const etatBadge = (etat) => {
            if (etat === 'Disponible')     return `<span class="badge-mat dispo">${etat}</span>`;
            if (etat === 'Occupee' || etat === 'Occupée') return `<span class="badge-mat occup">${etat}</span>`;
            if (etat === 'En Maintenance') return `<span class="badge-mat maint">${etat}</span>`;
            return `<span class="badge-mat dispo">${etat}</span>`;
        };

        document.getElementById('modalMatBody').innerHTML = `
            <div class="mat-stats">
                <span class="mat-stat-chip chip-blue">
                    <i class="fas fa-boxes"></i> ${total} élément${total > 1 ? 's' : ''}
                </span>
                <span class="mat-stat-chip chip-green">
                    <i class="fas fa-check-circle"></i> ${dispo} disponible${dispo > 1 ? 's' : ''}
                </span>
                ${occupe ? `<span class="mat-stat-chip chip-red">
                    <i class="fas fa-times-circle"></i> ${occupe} occupé${occupe > 1 ? 's' : ''}
                </span>` : ''}
                ${maint ? `<span class="mat-stat-chip chip-warn">
                    <i class="fas fa-tools"></i> ${maint} en maintenance
                </span>` : ''}
            </div>
            <div style="overflow-x:auto">
                <table class="mat-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>État</th>
                            <th>Quantité</th>
                            <th>Remarques</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mat.map(m => `
                        <tr>
                            <td style="color:#9ca3af;font-size:.75rem">${m.id_materiel}</td>
                            <td style="font-weight:600;color:#1a236d">${m.nom_materiel || '—'}</td>
                            <td><span class="material-badge" style="margin:0">${m.type_materiel || '—'}</span></td>
                            <td>${etatBadge(m.etat)}</td>
                            <td style="font-weight:700;color:#1a236d">${m.quantite ?? '—'}</td>
                            <td style="color:#6c757d;font-size:.82rem">${m.Remarques || '—'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (e) {
        document.getElementById('modalMatBody').innerHTML = `
            <div class="text-center py-4" style="color:#ef4444">
                <i class="fas fa-exclamation-triangle"
                   style="font-size:2rem;display:block;margin-bottom:.8rem"></i>
                Erreur : ${e.message}
            </div>`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', function (e) {
        if (e.target === this) closeModal(this.id);
    });
});

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast-notif ${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
getNombreInfoSalles();