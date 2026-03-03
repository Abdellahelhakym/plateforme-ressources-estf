AOS.init({ duration: 600, once: true });

// ────────────────────────────────────────────────
// CHARGEMENT — lecture seule, pas de boutons action
// ────────────────────────────────────────────────

async function loadFilieres() {
    const res  = await fetch('/ressource/filiere');
    const data = await res.json();
    const tbody = document.querySelector('#tableFilieres tbody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune filière enregistrée.</td></tr>';
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom_filiere}</td>
            <td>${item.annee}</td>
            <td>${item.niveau}</td>
            <td>${item.nb_group}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadProfesseurs() {
    const res  = await fetch('/ressource/professeur');
    const data = await res.json();
    const tbody = document.querySelector('#tableProfesseurs tbody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun professeur enregistré.</td></tr>';
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom}</td>
            <td>${item.prenom}</td>
            <td>${item.email}</td>
            <td>${item.departement}</td>
            <td>${item.filier || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadModules() {
    const res  = await fetch('/ressource/module');
    const data = await res.json();
    const tbody = document.querySelector('#tableModules tbody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Aucun module enregistré.</td></tr>';
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nom_module}</td>
            <td>${item.filiere || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.addEventListener('load', () => {
    loadFilieres();
    loadProfesseurs();
    loadModules();
});