AOS.init({ duration: 600, once: true });

// ────────────────────────────────────────────────
// CHARGEMENT — lecture seule, pas de boutons action
// ────────────────────────────────────────────────

let filieresData = [];
let professeursData = [];
let modulesData = [];

function parseIdList(raw) {
    return String(raw || '')
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(v => Number.isInteger(v) && v > 0);
}

function getFiliereSuffix(f) {
    const annee = String(f?.annee || '').trim();
    const niveau = String(f?.niveau || '').trim();
    return annee || niveau || 'Sans niveau';
}

function getFiliereLabel(f) {
    return `${f.nom_filiere} - ${getFiliereSuffix(f)}`;
}

async function loadFilieres() {
    const res  = await fetch('/ressource/filiere');
    filieresData = await res.json();
    renderFilieres();
    populateFilterFiliereOptions();
}

function renderFilieres() {
    const tbody = document.querySelector('#tableFilieres tbody');
    tbody.innerHTML = '';

    const anneeFilter = document.getElementById('filterFiliereAnnee')?.value || '';
    const data = filieresData.filter((item) => {
        if (!anneeFilter) return true;
        if (anneeFilter === '__empty__') return !String(item.annee || '').trim();
        return String(item.annee || '') === anneeFilter;
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune filière enregistrée.</td></tr>';
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom_filiere}</td>
            <td>${getFiliereSuffix(item)}</td>
            <td>${item.niveau}</td>
            <td>${item.nb_group}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadProfesseurs() {
    const res  = await fetch('/ressource/professeur');
    professeursData = await res.json();
    renderProfesseurs();
}

function renderProfesseurs() {
    const tbody = document.querySelector('#tableProfesseurs tbody');
    tbody.innerHTML = '';

    const filiereFilter = parseInt(document.getElementById('filterProfFiliere')?.value || '', 10);
    const data = professeursData.filter((item) => {
        if (!Number.isInteger(filiereFilter)) return true;
        const ids = parseIdList(item.id_filieres || item.id_filiere || '');
        return ids.includes(filiereFilter);
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun professeur enregistré.</td></tr>';
        return;
    }
    data.forEach(item => {
        const filieresLabel = item.filieres || item.filier || '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom}</td>
            <td>${item.prenom}</td>
            <td>${item.email}</td>
            <td>${item.departement}</td>
            <td>${filieresLabel}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadModules() {
    const res  = await fetch('/ressource/module');
    modulesData = await res.json();
    renderModules();
}

function renderModules() {
    const tbody = document.querySelector('#tableModules tbody');
    tbody.innerHTML = '';

    const filiereFilter = parseInt(document.getElementById('filterModuleFiliere')?.value || '', 10);
    const data = modulesData.filter((item) => {
        if (!Number.isInteger(filiereFilter)) return true;
        const ids = parseIdList(item.id_filieres || item.id_filiere || '');
        return ids.includes(filiereFilter);
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Aucun module enregistré.</td></tr>';
        return;
    }
    data.forEach(item => {
        const filiereLabel = item.filieres || item.filiere || '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom_module}</td>
            <td>${filiereLabel}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateFilterFiliereOptions() {
    const targets = ['filterProfFiliere', 'filterModuleFiliere'];
    targets.forEach((id) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Toutes les filières</option>';
        filieresData.forEach((f) => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = getFiliereLabel(f);
            sel.appendChild(opt);
        });
        sel.value = current;
    });
}

window.addEventListener('load', () => {
    document.getElementById('filterFiliereAnnee')?.addEventListener('change', renderFilieres);
    document.getElementById('filterProfFiliere')?.addEventListener('change', renderProfesseurs);
    document.getElementById('filterModuleFiliere')?.addEventListener('change', renderModules);

    loadFilieres();
    loadProfesseurs();
    loadModules();
});