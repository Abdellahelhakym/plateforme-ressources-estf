AOS.init({ duration: 600, once: true });

const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
let currentMode = 'semaine';
let allFilieres  = [];   // cache de toutes les filières
let allSemestresSalle = []; // cache semestres pour filtre salle (semaine/detail)

// Détermine l'année universitaire (1, 2 ou 3) à partir du nom du semestre
// S1/S2 → 1   |   S3/S4 → 2   |   S5/S6 → 3
function anneeFromSemestre(nomSemestre) {
    if (!nomSemestre) return null;
    const m = nomSemestre.match(/\d+/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    if (n <= 2) return '1';
    if (n <= 4) return '2';
    return '3';
}

function isBachelorSemester(nomSemestre) {
    if (!nomSemestre) return false;
    const m = String(nomSemestre).match(/\d+/);
    if (!m) return false;
    const n = parseInt(m[0], 10);
    return Number.isInteger(n) && n >= 5;
}

// =============================================================================
// UTILITAIRES
// =============================================================================

function fillSelect(sel, data, valKey, labelKey) {
    const first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    (data || []).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valKey];
        opt.textContent = item[labelKey];
        sel.appendChild(opt);
    });
}

function formatH(h) { return (h || '').substring(0, 5) || '—'; }

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function semesterMetaLabel(nomSemestre) {
    const n = parseInt(String(nomSemestre || '').replace(/\D+/g, ''), 10);
    if (!Number.isInteger(n)) return nomSemestre || '—';
    const annee = n <= 2 ? '1ere annee' : n <= 4 ? '2eme annee' : '3eme annee';
    return `${annee} · S${n}`;
}

function semestreNumber(nom) {
    const m = String(nom || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : 999;
}

function partieLabelFromSemestres(semestres) {
    const names = [...semestres]
        .map(s => s.nom_semestre)
        .filter(Boolean)
        .sort((a, b) => semestreNumber(a) - semestreNumber(b));
    return names.join('-');
}

function populateSemestreFilterSalle() {
    const sel = document.getElementById('filtSemestre');
    if (!sel) return;

    if (currentMode === 'semaine' || currentMode === 'detail') {
        sel.innerHTML = '<option value="">-- Choisir une partie --</option>';

        const grouped = {};
        allSemestresSalle.forEach(s => {
            const t = String(s.type_partit || '').trim().toLowerCase();
            if (!t) return;
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push(s);
        });

        Object.keys(grouped)
            .sort()
            .forEach(type => {
                const label = partieLabelFromSemestres(grouped[type]);
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = label || type;
                sel.appendChild(opt);
            });
        return;
    }

    sel.innerHTML = '<option value="">-- Choisir une partie --</option>';
}

// =============================================================================
// CHARGEMENT RÉFÉRENCE
// =============================================================================

async function loadRefData() {
    try {
        const [salles, annees, semestres, filieres] = await Promise.all([
            fetch('/consultation/data/salles').then(r => r.json()),
            fetch('/consultation/data/annees').then(r => r.json()),
            fetch('/consultation/data/semestres').then(r => r.json()),
            fetch('/consultation/data/filieres').then(r => r.json()),
        ]);

        // Cache des filières pour le filtrage dynamique
        allFilieres = filieres;
        allSemestresSalle = semestres;

        fillSelect(document.getElementById('filtSalle'),    salles,    'id_salle',    'nom_salle');
        fillSelect(document.getElementById('filtAnnee'),    annees,    'id_annee',    'libelle');
        populateSemestreFilterSalle();

        fillSelect(document.getElementById('filtAnneeF'),    annees,    'id_annee',    'libelle');
        fillSelect(document.getElementById('filtSemestreF'), semestres, 'id_semestre', 'nom_semestre');

        // Filière et semaines : vides au départ
        document.getElementById('filtFiliere').innerHTML  = '<option value="">-- Choisir d\'abord un semestre --</option>';
        document.getElementById('filtSemaine').innerHTML  = '<option value="">-- Choisir d\'abord une partie --</option>';
        document.getElementById('filtSemaineF').innerHTML = '<option value="">-- Choisir d\'abord un semestre --</option>';

    } catch(e) {
        console.error('Erreur chargement référence :', e);
    }
}

// =============================================================================
// SEMESTRE → SEMAINES (mode salle)
// =============================================================================

document.getElementById('filtSemestre').addEventListener('change', async function () {
    if (currentMode === 'semaine') {
        await reloadSemainesParPartie(this.value, document.getElementById('filtSemaine'));
    }
});

// =============================================================================
// SEMESTRE → SEMAINES + FILIÈRES (mode filière)
// S1/S2 → 1ère année  |  S3/S4 → 2ème année  |  S5/S6 → 3ème année
// =============================================================================

document.getElementById('filtSemestreF').addEventListener('change', async function () {
    const nomSemestre = this.selectedOptions[0]?.text || '';
    const annee       = anneeFromSemestre(nomSemestre);
    const bachelorSem = isBachelorSemester(nomSemestre);
    const selFiliere  = document.getElementById('filtFiliere');

    // Recharger les semaines
    await reloadSemaines(this.value, document.getElementById('filtSemaineF'));

    // Réinitialiser la liste des filières
    selFiliere.innerHTML = '<option value="">-- Choisir --</option>';

    if (!this.value) {
        selFiliere.innerHTML = '<option value="">-- Choisir d\'abord un semestre --</option>';
        return;
    }

    // Règle métier : S5/S6 -> uniquement filières Bachelor.
    // Sinon : filtrage classique par année.
    const filtered = bachelorSem
        ? allFilieres.filter(f => String(f.niveau || '').trim().toLowerCase() === 'bachelor')
        : (annee
            ? allFilieres.filter(f => String(f.annee || '').startsWith(annee))
            : allFilieres);

    if (filtered.length === 0) {
        selFiliere.innerHTML = '<option value="">Aucune filière pour ce semestre</option>';
    } else {
        fillSelect(selFiliere, filtered, 'id_filiere', 'label');
    }
});

// =============================================================================
// RECHARGER LES SEMAINES
// =============================================================================

async function reloadSemaines(id_semestre, selSemaine) {
    selSemaine.innerHTML = '<option value="">-- Choisir --</option>';
    if (!id_semestre) {
        selSemaine.innerHTML = '<option value="">-- Choisir d\'abord un semestre --</option>';
        return;
    }
    try {
        const semaines = await fetch(`/consultation/data/semaines?id_semestre=${id_semestre}`).then(r => r.json());
        fillSelect(selSemaine, semaines, 'id_semaine', 'nom_semaine');
        if (!semaines.length) selSemaine.innerHTML = '<option value="">Aucune semaine pour ce semestre</option>';
    } catch(e) {
        selSemaine.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

async function reloadSemainesParPartie(typePartit, selSemaine) {
    selSemaine.innerHTML = '<option value="">-- Choisir --</option>';
    if (!typePartit) {
        selSemaine.innerHTML = '<option value="">-- Choisir d\'abord une partie --</option>';
        return;
    }
    try {
        const semaines = await fetch(`/consultation/data/semaines-par-partie?type_partit=${encodeURIComponent(typePartit)}`).then(r => r.json());
        const first = selSemaine.options[0];
        selSemaine.innerHTML = '';
        selSemaine.appendChild(first);
        (semaines || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.nom_semaine || '';
            opt.dataset.weekName = item.nom_semaine || '';
            opt.textContent = item.nom_semaine || '';
            selSemaine.appendChild(opt);
        });
        if (!semaines.length) selSemaine.innerHTML = '<option value="">Aucune semaine pour cette partie</option>';
    } catch(e) {
        selSemaine.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

// =============================================================================
// MODE
// =============================================================================

function setMode(mode) {
    currentMode = mode;

    document.getElementById('modeSemaine').classList.toggle('active', mode === 'semaine');
    document.getElementById('modeDetail').classList.toggle('active',  mode === 'detail');
    document.getElementById('modeFiliere').classList.toggle('active', mode === 'filiere');

    const isSalle   = mode === 'semaine' || mode === 'detail';
    const isFiliere = mode === 'filiere';

    document.getElementById('filtersSalle').style.display   = isSalle   ? '' : 'none';
    document.getElementById('filtersFiliere').style.display = isFiliere ? '' : 'none';
    document.getElementById('filtSemaineWrap').style.display = mode === 'semaine' ? '' : 'none';

    populateSemestreFilterSalle();
    if (mode === 'semaine') {
        document.getElementById('filtSemaine').innerHTML = '<option value="">-- Choisir d\'abord une partie --</option>';
    } else {
        document.getElementById('filtSemaine').innerHTML = '<option value="">-- Semaine non requise en mode détail --</option>';
    }

    document.getElementById('legendeSalle').style.display   = isFiliere ? 'none' : '';
    document.getElementById('legendeFiliere').style.display = isFiliere ? ''     : 'none';

    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('statsRow').style.display = 'none';
}

// =============================================================================
// RECHERCHE — SALLE
// =============================================================================

async function rechercher() {
    const id_salle    = document.getElementById('filtSalle').value;
    const semaineSel  = document.getElementById('filtSemaine');
    const semaineVal  = semaineSel.value;
    const id_annee    = document.getElementById('filtAnnee').value;
    const typePartit  = document.getElementById('filtSemestre').value;

    let nom_semaine = semaineSel.selectedOptions[0]?.dataset.weekName || '';
    let id_semaine = semaineVal;

    if (!id_salle) return alert('Veuillez choisir une salle.');
    if (currentMode === 'semaine' && !id_semaine) return alert('Veuillez choisir une semaine.');
    if ((currentMode === 'semaine' || currentMode === 'detail') && !typePartit) {
        return alert('Veuillez choisir une partie.');
    }

    showLoader();

    try {
        if (currentMode === 'semaine') {
            const qs = new URLSearchParams({ id_salle, type_partit: typePartit });
            if (id_annee) qs.set('id_annee', id_annee);
            if (nom_semaine) qs.set('nom_semaine', nom_semaine);
            const resp = await fetch('/consultation/salle/partie?' + qs);
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            const data = await resp.json();
            if (!data?.creneaux || !data?.semestres) throw new Error('Réponse serveur invalide');
            renderDetailPartie(data);
        } else {
            const qs = new URLSearchParams({ id_salle, type_partit: typePartit });
            if (id_annee)    qs.set('id_annee',    id_annee);
            const resp = await fetch('/consultation/salle/detail?' + qs);
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            const data = await resp.json();
            if (!data?.creneaux || !data?.semaines) throw new Error('Réponse serveur invalide');
            renderDetail(data);
        }
    } catch (e) {
        showError(e.message);
    }
}

// =============================================================================
// RECHERCHE — FILIÈRE
// =============================================================================

async function rechercherFiliere() {
    const id_filiere  = document.getElementById('filtFiliere').value;
    const id_semaine  = document.getElementById('filtSemaineF').value;
    const id_annee    = document.getElementById('filtAnneeF').value;
    const id_semestre = document.getElementById('filtSemestreF').value;

    if (!id_filiere) return alert('Veuillez choisir une filière.');
    if (!id_semaine) return alert('Veuillez choisir une semaine.');

    showLoader();

    try {
        const qs = new URLSearchParams({ id_filiere, id_semaine });
        if (id_annee)    qs.set('id_annee',    id_annee);
        if (id_semestre) qs.set('id_semestre', id_semestre);
        const resp = await fetch('/consultation/filiere?' + qs);
        if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
        const data = await resp.json();
        if (!data?.creneaux || !data?.grille || !data?.stats) throw new Error('Réponse serveur invalide');
        const nomFiliere = document.getElementById('filtFiliere').selectedOptions[0].text;
        const nomSem     = document.getElementById('filtSemaineF').selectedOptions[0].text;
        renderFiliere(data, nomFiliere, nomSem);
    } catch (e) {
        showError(e.message);
    }
}

// =============================================================================
// HELPERS AFFICHAGE
// =============================================================================

function showLoader() {
    document.getElementById('resultsContainer').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-muted">Chargement...</p>
        </div>`;
}

function showError(msg) {
    console.error(msg);
    document.getElementById('resultsContainer').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color:#ef4444"></i>
            <p style="color:#ef4444; font-weight:600;">Erreur : ${msg}</p>
        </div>`;
}

// =============================================================================
// STATS
// =============================================================================

function showStats(total, occupes, libres, taux) {
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statOcc').textContent   = occupes;
    document.getElementById('statLib').textContent   = libres;
    document.getElementById('statTaux').textContent  = taux + '%';
    document.getElementById('statsRow').style.display = 'grid';
}

// =============================================================================
// RENDER MODE SEMAINE (salle)
// =============================================================================

function renderSemaine(data, semNom) {
    const { creneaux, grille, stats } = data;
    const nomSalle = document.getElementById('filtSalle').selectedOptions[0].text;
    showStats(stats.total, stats.occupes, stats.libres, stats.taux);

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (!creneaux.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucun créneau trouvé.</p></div>';
        return;
    }

    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.innerHTML = `
        <div class="schedule-card-header">
            <h5><i class="fas fa-calendar-week me-2"></i>${nomSalle} — ${semNom}</h5>
            <div class="view-btns">
                <button class="view-btn view-btn-all active" onclick="applyFilter(this,'all',this.closest('.schedule-card'))">
                    <i class="fas fa-border-all"></i> Tous
                </button>
                <button class="view-btn view-btn-lib" onclick="applyFilter(this,'libre',this.closest('.schedule-card'))">
                    <i class="fas fa-door-open"></i> Libres seulement
                </button>
                <button class="view-btn view-btn-occ" onclick="applyFilter(this,'occupee',this.closest('.schedule-card'))">
                    <i class="fas fa-door-closed"></i> Occupés seulement
                </button>
            </div>
        </div>
        <div style="overflow-x:auto">
            ${buildGrilleTable(creneaux, grille)}
        </div>
    `;
    container.appendChild(card);
}

// =============================================================================
// RENDER MODE DÉTAIL (salle)
// =============================================================================

function renderDetail(data) {
    const { creneaux, semaines } = data;
    const nomSalle = document.getElementById('filtSalle').selectedOptions[0].text;
    const nomPartie = document.getElementById('filtSemestre').selectedOptions[0]?.text || '';

    let totalAll = 0, occAll = 0;
    semaines.forEach(s => { if (s?.stats) { totalAll += s.stats.total; occAll += s.stats.occupes; } });
    showStats(totalAll, occAll, totalAll - occAll, totalAll ? Math.round(occAll / totalAll * 100) : 0);

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `<h5 class="mb-3" style="color:#1a236d; font-weight:700;">
        <i class="fas fa-building me-2"></i>${nomSalle} — ${nomPartie ? `Partie ${nomPartie}` : 'Toutes les parties'}
    </h5>`;

    if (!semaines.length) {
        container.innerHTML += '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucune semaine trouvée.</p></div>';
        return;
    }

    semaines.forEach((s, idx) => {
        if (!s?.semaine || !s?.stats || !s?.grille) return;
        const { semaine, grille, stats } = s;
        const tauxColor = stats.taux > 70 ? '#ef4444' : stats.taux > 40 ? '#f59e0b' : '#22c55e';

        const acc = document.createElement('div');
        acc.className = 'sem-accordion';
        acc.innerHTML = `
            <div class="sem-acc-header" onclick="toggleAcc(this)">
                <div>
                    <div class="sem-title">
                        <i class="fas fa-calendar-week" style="color:#2c75bd"></i>
                        ${semaine.nom_semaine || ''}
                    </div>
                    <div class="sem-dates">${formatDate(semaine.date_debut)} → ${formatDate(semaine.date_fin)}</div>
                    <div class="taux-bar">
                        <div class="taux-bar-fill" style="width:${stats.taux}%; background:${tauxColor}"></div>
                    </div>
                </div>
                <div class="text-end">
                    <div style="font-size:.85rem; font-weight:700; color:${tauxColor}">${stats.taux}% occupé</div>
                    <div style="font-size:.75rem; color:#6b7280; margin-top:4px;">
                        <span style="color:#ef4444">${stats.occupes} occupés</span> ·
                        <span style="color:#22c55e">${stats.libres} libres</span>
                    </div>
                    <i class="fas ${idx === 0 ? 'fa-chevron-up' : 'fa-chevron-down'} mt-1" style="color:#9ca3af; font-size:.8rem"></i>
                </div>
            </div>
            <div class="sem-acc-body ${idx === 0 ? 'open' : ''}">
                <div class="view-btns p-2" style="border-bottom:1px solid #f0f4f8">
                    <button class="view-btn view-btn-all active" onclick="applyFilter(this,'all',this.closest('.sem-acc-body'))">
                        <i class="fas fa-border-all"></i> Tous
                    </button>
                    <button class="view-btn view-btn-lib" onclick="applyFilter(this,'libre',this.closest('.sem-acc-body'))">
                        <i class="fas fa-door-open"></i> Libres seulement
                    </button>
                    <button class="view-btn view-btn-occ" onclick="applyFilter(this,'occupee',this.closest('.sem-acc-body'))">
                        <i class="fas fa-door-closed"></i> Occupés seulement
                    </button>
                </div>
                ${buildGrilleTable(creneaux, grille)}
            </div>
        `;
        container.appendChild(acc);
    });
}

function renderDetailPartie(data) {
    const { creneaux, semestres, nom_semaine } = data;
    const nomSalle = document.getElementById('filtSalle').selectedOptions[0].text;
    const partieLabel = document.getElementById('filtSemestre').selectedOptions[0]?.text || '';

    let totalAll = 0;
    let occAll = 0;
    (semestres || []).forEach(s => {
        if (s?.stats) {
            totalAll += s.stats.total;
            occAll += s.stats.occupes;
        }
    });
    showStats(totalAll, occAll, totalAll - occAll, totalAll ? Math.round(occAll / totalAll * 100) : 0);

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `<h5 class="mb-3" style="color:#1a236d; font-weight:700;">
        <i class="fas fa-building me-2"></i>${nomSalle} — Partie ${partieLabel} — ${nom_semaine || ''}
    </h5>`;

    if (!semestres?.length) {
        container.innerHTML += '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucun semestre pour cette partie.</p></div>';
        return;
    }

    semestres.forEach(s => {
        if (!s?.semestre || !s?.grille || !s?.stats) return;
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.innerHTML = `
            <div class="schedule-card-header">
                <h5>
                    <i class="fas fa-calendar-check me-2"></i>${s.semestre.nom_semestre}
                    ${!s.hasSemaine ? '<span style="font-size:.8rem; margin-left:8px; opacity:.9;">(semaine non définie)</span>' : ''}
                </h5>
                <div class="view-btns">
                    <button class="view-btn view-btn-all active" onclick="applyFilter(this,'all',this.closest('.schedule-card'))">
                        <i class="fas fa-border-all"></i> Tous
                    </button>
                    <button class="view-btn view-btn-lib" onclick="applyFilter(this,'libre',this.closest('.schedule-card'))">
                        <i class="fas fa-door-open"></i> Libres seulement
                    </button>
                    <button class="view-btn view-btn-occ" onclick="applyFilter(this,'occupee',this.closest('.schedule-card'))">
                        <i class="fas fa-door-closed"></i> Occupés seulement
                    </button>
                </div>
            </div>
            <div style="overflow-x:auto">
                ${buildGrilleTable(creneaux, s.grille)}
            </div>
        `;
        container.appendChild(card);
    });
}

// =============================================================================
// RENDER MODE FILIÈRE
// =============================================================================

function renderFiliere(data, nomFiliere, nomSem) {
    const { creneaux, grille, stats } = data;
    showStats(stats.total, stats.occupes, stats.libres, stats.taux);

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (!creneaux.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucun créneau trouvé.</p></div>';
        return;
    }

    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.innerHTML = `
        <div class="schedule-card-header">
            <h5><i class="fas fa-graduation-cap me-2" style="color:#3b82f6"></i>${nomFiliere} — ${nomSem}</h5>
            <div class="view-btns">
                <button class="view-btn view-btn-all active" onclick="applyFilter(this,'all',this.closest('.schedule-card'))">
                    <i class="fas fa-border-all"></i> Tous
                </button>
                <button class="view-btn view-btn-lib" onclick="applyFilter(this,'libre',this.closest('.schedule-card'))">
                    <i class="fas fa-door-open"></i> Libres
                </button>
                <button class="view-btn view-btn-occ" onclick="applyFilter(this,'occupee',this.closest('.schedule-card'))">
                    <i class="fas fa-door-closed"></i> Occupés
                </button>
            </div>
        </div>
        <div style="overflow-x:auto">
            ${buildGrilleFiliere(creneaux, grille)}
        </div>
    `;
    container.appendChild(card);
}

// =============================================================================
// CONSTRUIRE TABLEAU GRILLE — SALLE (sans bouton supprimer)
// =============================================================================

function buildGrilleTable(creneaux, grille) {
    if (!creneaux?.length || !grille) return '<p class="p-3 text-muted">Aucune donnée.</p>';

    let html = '<table class="grille-table"><thead><tr>';
    html += '<th data-col-index="0">Créneau</th>';
    JOURS.forEach((j, i) => { html += `<th data-col-index="${i + 1}">${j}</th>`; });
    html += '</tr></thead><tbody>';

    creneaux.forEach(cr => {
        html += '<tr>';
        html += `<td class="cell-heure" data-col-index="0"><i class="far fa-clock me-1"></i>${formatH(cr.heure_debut)} - ${formatH(cr.heure_fin)}</td>`;

        JOURS.forEach((jour, i) => {
            const colIdx   = i + 1;
            const jourData = grille[jour];
            if (!jourData) { html += `<td data-col-index="${colIdx}">—</td>`; return; }

            const cell = jourData[cr.id_creneau];
            if (!cell || cell.statut !== 'occupee') {
                html += `<td class="cell-libre" data-statut="libre" data-col-index="${colIdx}">
                    <span class="badge-libre">Libre</span>
                    <div class="occ-detail" style="color:#166534"><i class="fas fa-check-circle"></i> Disponible</div>
                </td>`;
                return;
            }

            const items = Array.isArray(cell.items) ? cell.items : [cell];

            html += `<td class="cell-occupee" data-statut="occupee" data-col-index="${colIdx}">
                <span class="badge-occupee">Occupée</span>
                <div class="occ-detail">
                    ${items.map(item => `
                        <div><i class="fas fa-book" style="color:#ef4444"></i> ${item.module || '—'}</div>
                        <div><i class="fas fa-graduation-cap" style="color:#f97316"></i> ${item.filiere || '—'} Gr.${item.group || '?'}</div>
                        <div><i class="fas fa-layer-group" style="color:#0ea5e9"></i> ${semesterMetaLabel(item.nom_semestre)}</div>
                        <div><i class="fas fa-user-tie" style="color:#6b7280"></i> ${item.professeur || '—'}</div>
                    `).join('<hr style="margin:4px 0; border-color:#fecaca">')}
                </div>
            </td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// =============================================================================
// CONSTRUIRE TABLEAU GRILLE — FILIÈRE
// Chaque cellule affiche : module, salle, professeur, groupe (multi-groupes supportés)
// =============================================================================

function buildGrilleFiliere(creneaux, grille) {
    if (!creneaux?.length || !grille) return '<p class="p-3 text-muted">Aucune donnée.</p>';

    let html = '<table class="grille-table"><thead><tr>';
    html += '<th data-col-index="0">Créneau</th>';
    JOURS.forEach((j, i) => { html += `<th data-col-index="${i + 1}">${j}</th>`; });
    html += '</tr></thead><tbody>';

    creneaux.forEach(cr => {
        html += '<tr>';
        html += `<td class="cell-heure" data-col-index="0"><i class="far fa-clock me-1"></i>${formatH(cr.heure_debut)} - ${formatH(cr.heure_fin)}</td>`;

        JOURS.forEach((jour, i) => {
            const colIdx   = i + 1;
            const jourData = grille[jour];
            if (!jourData) { html += `<td data-col-index="${colIdx}">—</td>`; return; }

            const cell = jourData[cr.id_creneau];

            if (!cell || cell.statut === 'libre') {
                html += `<td class="cell-libre" data-statut="libre" data-col-index="${colIdx}">
                    <span class="badge-libre">Libre</span>
                    <div class="occ-detail" style="color:#166534"><i class="fas fa-check-circle"></i> Disponible</div>
                </td>`;
                return;
            }

            const items = Array.isArray(cell.items) ? cell.items : [cell];
            html += `<td class="cell-filiere" data-statut="occupee" data-col-index="${colIdx}">
                <span class="badge-filiere" style="background:#3b82f6; color:#fff; border-radius:20px; padding:2px 10px; font-size:.7rem; font-weight:700; display:inline-block; margin-bottom:4px;">
                    <i class="fas fa-book-open"></i> Cours
                </span>
                <div class="occ-detail">
                    ${items.map((item, idx) => `
                        <div class="${idx > 0 ? 'mt-2 pt-2' : ''}" style="${idx > 0 ? 'border-top:1px dashed #bfdbfe' : ''}">
                            <div><i class="fas fa-book" style="color:#3b82f6"></i> <strong>${item.module || '—'}</strong></div>
                            <div><i class="fas fa-door-open" style="color:#6b7280"></i> Salle : ${item.salle || '—'}</div>
                            <div><i class="fas fa-user-tie" style="color:#6b7280"></i> ${item.professeur || '—'}</div>
                            ${item.group ? `<div><i class="fas fa-users" style="color:#6b7280"></i> Gr. ${item.group}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// =============================================================================
// FILTRE COLONNES
// =============================================================================

function applyFilter(btn, statut, scope) {
    scope.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const table = scope.querySelector('.grille-table');
    if (!table) return;

    table.querySelectorAll('th, td').forEach(el => {
        el.classList.remove('col-hidden');
        el.style.visibility = '';
        el.style.background  = '';
        el.style.border      = '';
    });
    table.querySelectorAll('tbody tr').forEach(tr => tr.style.display = '');

    if (statut === 'all') return;

    const visibleCols = new Set();
    for (let col = 1; col <= 7; col++) {
        if (table.querySelector(`td[data-statut="${statut}"][data-col-index="${col}"]`))
            visibleCols.add(col);
    }

    for (let col = 1; col <= 7; col++) {
        if (!visibleCols.has(col)) {
            const th = table.querySelector(`th[data-col-index="${col}"]`);
            if (th) th.classList.add('col-hidden');
            table.querySelectorAll(`td[data-col-index="${col}"]`)
                 .forEach(td => td.classList.add('col-hidden'));
        }
    }

    table.querySelectorAll('tbody tr').forEach(tr => {
        const hasGood = Array.from(tr.querySelectorAll(`td[data-statut="${statut}"]`))
            .some(td => visibleCols.has(parseInt(td.dataset.colIndex)));

        if (!hasGood) { tr.style.display = 'none'; return; }

        tr.querySelectorAll('td[data-statut]').forEach(td => {
            const colIdx = parseInt(td.dataset.colIndex);
            if (!visibleCols.has(colIdx)) return;
            if (td.dataset.statut !== statut) {
                td.style.visibility = 'hidden';
                td.style.background = 'transparent';
                td.style.border     = 'none';
            }
        });
    });
}

// =============================================================================
// ACCORDION
// =============================================================================

function toggleAcc(header) {
    const body = header.nextElementSibling;
    const icon = header.querySelector('[class*="fa-chevron"]');
    body.classList.toggle('open');
    if (icon) {
        icon.classList.toggle('fa-chevron-down', !body.classList.contains('open'));
        icon.classList.toggle('fa-chevron-up',    body.classList.contains('open'));
    }
}

// =============================================================================
// INIT
// =============================================================================
window.addEventListener('load', () => {
    loadRefData();
    setMode('semaine');
});