AOS.init({ duration: 800, once: true });

let semestresData  = [];
let seminesAllData = [];

// ══════════════════════════════════════════════════════════
// CHARGEMENT — lecture seule, aucun bouton action
// ══════════════════════════════════════════════════════════

async function loadAnnees() {
    const res  = await fetch('/config/annee');
    const data = await res.json();
    const row  = document.getElementById('rowAnnees');
    row.innerHTML = '';

    if (data.length === 0) {
        row.innerHTML = '<p class="text-muted">Aucune année enregistrée.</p>';
        return;
    }

    data.forEach((item, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        col.innerHTML = `
            <div class="time-card ${index === 0 ? 'active-year' : ''}">
                <div class="time-icon">
                    <i class="fas fa-calendar${index === 0 ? '-check' : ''}"></i>
                </div>
                <h5>${item.libelle}</h5>
            </div>
        `;
        row.appendChild(col);
    });
}

async function loadSemestres() {
    const res  = await fetch('/config/semestre');
    const data = await res.json();
    semestresData = data;

    const tbody = document.getElementById('tbodySemestres');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Aucun semestre enregistré.</td></tr>';
    } else {
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nom_semestre}</td>
                <td><span class="badge bg-secondary">${item.type_partit || '—'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Peupler le filtre semaine
    const filterSel = document.getElementById('filterSemestre');
    filterSel.innerHTML = '<option value="">Tous les semestres</option>';
    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value       = item.id_semestre;
        opt.textContent = item.nom_semestre;
        filterSel.appendChild(opt);
    });
}

async function loadSemaines(filterIdSemestre = '') {
    const res  = await fetch('/config/semaine');
    const data = await res.json();
    seminesAllData = data;
    renderSemaines(filterIdSemestre);
}

function renderSemaines(filterIdSemestre = '') {
    const row = document.getElementById('rowSemaines');
    row.innerHTML = '';

    const filtered = filterIdSemestre
        ? seminesAllData.filter(s => String(s.id_semestre) === String(filterIdSemestre))
        : seminesAllData;

    if (filtered.length === 0) {
        row.innerHTML = '<p class="text-muted">Aucune semaine enregistrée.</p>';
        return;
    }

    filtered.forEach((item, index) => {
        const col   = document.createElement('div');
        col.className = 'col-md-3 col-sm-6 mb-3';
        const debut = item.date_debut ? item.date_debut.substring(0, 10) : '—';
        const fin   = item.date_fin   ? item.date_fin.substring(0, 10)   : '—';

        const semLabel = item.nom_semestre
            ? `<span class="badge bg-primary ms-1">${item.nom_semestre}</span>`
            : '';

        // ✅ Pas de boutons modifier/supprimer
        col.innerHTML = `
            <div class="week-card">
                <div class="week-number">${index + 1}</div>
                <h6>${item.nom_semaine} ${semLabel}</h6>
                <p><i class="fas fa-calendar"></i> ${debut} → ${fin}</p>
            </div>
        `;
        row.appendChild(col);
    });
}

async function loadCreneaux() {
    const res  = await fetch('/config/creneau');
    const data = await res.json();
    const tbody = document.getElementById('tbodyCreneaux');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun créneau enregistré.</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-info">Créneau ${index + 1}</span></td>
            <td>${item.heure_debut || '—'}</td>
            <td>${item.heure_fin   || '—'}</td>
            <td>${item.duree       || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Filtre semaines
document.getElementById('filterSemestre').addEventListener('change', function () {
    renderSemaines(this.value);
});

// Init
window.addEventListener('load', async () => {
    await loadSemestres();
    loadAnnees();
    loadSemaines();
    loadCreneaux();
});