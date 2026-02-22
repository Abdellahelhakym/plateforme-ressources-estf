AOS.init({ duration: 600, once: true });

// JOURS avec leur index de colonne dans le tableau (0 = colonne Créneau, 1 = Lundi, ...)
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
let currentMode = 'semaine';
let pendingDelete = null;

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

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast-notif ${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// =============================================================================
// CHARGEMENT RÉFÉRENCE
// =============================================================================

async function loadRefData() {
    try {
        const [salles, semaines, annees, semestres] = await Promise.all([
            fetch('/consultation/data/salles').then(r => r.json()),
            fetch('/consultation/data/semaines').then(r => r.json()),
            fetch('/consultation/data/annees').then(r => r.json()),
            fetch('/consultation/data/semestres').then(r => r.json()),
        ]);
        fillSelect(document.getElementById('filtSalle'),    salles,    'id_salle',    'nom_salle');
        fillSelect(document.getElementById('filtSemaine'),  semaines,  'id_semaine',  'nom_semaine');
        fillSelect(document.getElementById('filtAnnee'),    annees,    'id_annee',    'libelle');
        fillSelect(document.getElementById('filtSemestre'), semestres, 'id_semestre', 'nom_semestre');
    } catch(e) {
        console.error('Erreur chargement référence :', e);
    }
}

// =============================================================================
// MODE
// =============================================================================

function setMode(mode) {
    currentMode = mode;
    document.getElementById('modeSemaine').classList.toggle('active', mode === 'semaine');
    document.getElementById('modeDetail').classList.toggle('active', mode === 'detail');
    document.getElementById('filtSemaineWrap').style.display = mode === 'semaine' ? '' : 'none';
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('statsRow').style.display = 'none';
}

// =============================================================================
// RECHERCHE
// =============================================================================

async function rechercher() {
    const id_salle    = document.getElementById('filtSalle').value;
    const id_semaine  = document.getElementById('filtSemaine').value;
    const id_annee    = document.getElementById('filtAnnee').value;
    const id_semestre = document.getElementById('filtSemestre').value;

    if (!id_salle) return alert('Veuillez choisir une salle.');
    if (currentMode === 'semaine' && !id_semaine) return alert('Veuillez choisir une semaine.');

    document.getElementById('resultsContainer').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-muted">Chargement...</p>
        </div>`;

    try {
        if (currentMode === 'semaine') {
            const qs = new URLSearchParams({ id_salle, id_semaine });
            if (id_annee)    qs.set('id_annee',    id_annee);
            if (id_semestre) qs.set('id_semestre', id_semestre);
            const resp = await fetch('/consultation/salle?' + qs);
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            const data = await resp.json();
            if (!data?.creneaux || !data?.grille || !data?.stats) throw new Error('Réponse serveur invalide');
            renderSemaine(data, document.getElementById('filtSemaine').selectedOptions[0].text);
        } else {
            const qs = new URLSearchParams({ id_salle });
            if (id_annee)    qs.set('id_annee',    id_annee);
            if (id_semestre) qs.set('id_semestre', id_semestre);
            const resp = await fetch('/consultation/salle/detail?' + qs);
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            const data = await resp.json();
            if (!data?.creneaux || !data?.semaines) throw new Error('Réponse serveur invalide');
            renderDetail(data);
        }
    } catch (e) {
        console.error(e);
        document.getElementById('resultsContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color:#ef4444"></i>
                <p style="color:#ef4444; font-weight:600;">Erreur : ${e.message}</p>
            </div>`;
    }
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

function updateStats(delta) {
    const occ   = parseInt(document.getElementById('statOcc').textContent) + delta;
    const total = parseInt(document.getElementById('statTotal').textContent);
    const lib   = total - occ;
    document.getElementById('statOcc').textContent  = occ;
    document.getElementById('statLib').textContent  = lib;
    document.getElementById('statTaux').textContent = total > 0 ? Math.round(occ / total * 100) + '%' : '0%';
}

// =============================================================================
// RENDER MODE SEMAINE
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
// RENDER MODE DÉTAIL
// =============================================================================

function renderDetail(data) {
    const { creneaux, semaines } = data;
    const nomSalle = document.getElementById('filtSalle').selectedOptions[0].text;

    let totalAll = 0, occAll = 0;
    semaines.forEach(s => { if (s?.stats) { totalAll += s.stats.total; occAll += s.stats.occupes; } });
    showStats(totalAll, occAll, totalAll - occAll, totalAll ? Math.round(occAll / totalAll * 100) : 0);

    const container = document.getElementById('resultsContainer');
    container.innerHTML = `<h5 class="mb-3" style="color:#1a236d; font-weight:700;">
        <i class="fas fa-building me-2"></i>${nomSalle} — Toutes les semaines
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

// =============================================================================
// CONSTRUIRE TABLEAU GRILLE
// Chaque th et td de jour reçoit data-col-index="N" (1..7)
// La colonne "Créneau" a index 0 et ne se cache jamais
// =============================================================================

function buildGrilleTable(creneaux, grille) {
    if (!creneaux?.length || !grille) return '<p class="p-3 text-muted">Aucune donnée.</p>';

    // En-tête
    let html = '<table class="grille-table"><thead><tr>';
    html += '<th data-col-index="0">Créneau</th>';
    JOURS.forEach((j, i) => {
        html += `<th data-col-index="${i + 1}">${j}</th>`;
    });
    html += '</tr></thead><tbody>';

    creneaux.forEach(cr => {
        html += `<tr>`;
        html += `<td class="cell-heure" data-col-index="0"><i class="far fa-clock me-1"></i>${formatH(cr.heure_debut)} - ${formatH(cr.heure_fin)}</td>`;

        JOURS.forEach((jour, i) => {
            const colIdx = i + 1;
            const jourData = grille[jour];
            if (!jourData) {
                html += `<td data-col-index="${colIdx}">—</td>`;
                return;
            }
            const cell = jourData[cr.id_creneau];
            if (!cell) {
                html += `<td class="cell-libre" data-statut="libre" data-col-index="${colIdx}">
                    <span class="badge-libre">Libre</span>
                    <div class="occ-detail" style="color:#166534"><i class="fas fa-check-circle"></i> Disponible</div>
                </td>`;
                return;
            }

            if (cell.statut === 'occupee') {
                const infoHtml = `
                    <div><i class="fas fa-book"></i> <strong>Module :</strong> ${cell.module || '—'}</div>
                    <div><i class="fas fa-graduation-cap"></i> <strong>Filière :</strong> ${cell.filiere || '—'} — Groupe ${cell.group || '?'}</div>
                    <div><i class="fas fa-user-tie"></i> <strong>Prof :</strong> ${cell.professeur || '—'}</div>
                    <div><i class="fas fa-calendar-day"></i> <strong>Jour :</strong> ${jour}</div>
                    <div><i class="fas fa-clock"></i> <strong>Créneau :</strong> ${formatH(cell.heure_debut)} - ${formatH(cell.heure_fin)}</div>
                    <div><i class="fas fa-calendar-week"></i> <strong>Semaines :</strong> ${cell.semaine_debut || '?'} → ${cell.semaine_fin || '?'}</div>
                `.trim();
                const encoded = encodeURIComponent(infoHtml);

                html += `<td class="cell-occupee" data-statut="occupee" data-col-index="${colIdx}" data-id="${cell.id_occupation}">
                    <span class="badge-occupee">Occupée</span>
                    <div class="occ-detail">
                        <div><i class="fas fa-book" style="color:#ef4444"></i> ${cell.module || '—'}</div>
                        <div><i class="fas fa-graduation-cap" style="color:#f97316"></i> ${cell.filiere || '—'} Gr.${cell.group || '?'}</div>
                        <div><i class="fas fa-user-tie" style="color:#6b7280"></i> ${cell.professeur || '—'}</div>
                    </div>
                    <button class="btn-del-cell"
                        onclick="openDelModal(${cell.id_occupation}, this.closest('td'), decodeURIComponent('${encoded}'))"
                    ><i class="fas fa-trash-alt"></i> Supprimer</button>
                </td>`;
            } else {
                html += `<td class="cell-libre" data-statut="libre" data-col-index="${colIdx}">
                    <span class="badge-libre">Libre</span>
                    <div class="occ-detail" style="color:#166534"><i class="fas fa-check-circle"></i> Disponible</div>
                </td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

// =============================================================================
// ── FILTRE PRINCIPAL ──
// Logique :
//   1. Mettre à jour les boutons actifs
//   2. Afficher / cacher les cellules td selon data-statut
//   3. Pour chaque colonne jour (index 1..7) :
//      vérifier si au moins 1 td visible existe dans cette colonne
//      → si non : cacher le th ET tous les td de cet index
//      → si oui  : montrer  le th ET tous les td de cet index
// =============================================================================

function applyFilter(btn, statut, scope) {
    // 1. Boutons actifs
    scope.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const table = scope.querySelector('.grille-table');
    if (!table) return;

    // ── Réinitialisation complète ────────────────────────────────────────────
    // Retirer tous les styles inline et col-hidden pour repartir d'un état propre
    table.querySelectorAll('th, td').forEach(el => {
        el.classList.remove('col-hidden');
        el.style.visibility = '';
        el.style.background  = '';
        el.style.border      = '';
    });
    table.querySelectorAll('tbody tr').forEach(tr => tr.style.display = '');

    if (statut === 'all') return;   // mode "Tous" → tout visible, terminé

    // ── ÉTAPE 1 : Quelles colonnes ont au moins 1 cellule du bon statut ? ────
    // On utilise les DATA-STATUT originaux dans le DOM (jamais modifiés).
    const visibleCols = new Set();
    for (let col = 1; col <= 7; col++) {
        if (table.querySelector('td[data-statut="' + statut + '"][data-col-index="' + col + '"]'))
            visibleCols.add(col);
    }

    // ── ÉTAPE 2 : Cacher entièrement les colonnes sans aucune cellule utile ──
    for (let col = 1; col <= 7; col++) {
        if (!visibleCols.has(col)) {
            const th = table.querySelector('th[data-col-index="' + col + '"]');
            if (th) th.classList.add('col-hidden');
            table.querySelectorAll('td[data-col-index="' + col + '"]')
                 .forEach(td => td.classList.add('col-hidden'));
        }
    }

    // ── ÉTAPE 3 : Dans les colonnes visibles, traiter chaque ligne ───────────
    // Stratégie : visibility:hidden (garde l'espace) sur les cellules qui ne
    // correspondent pas → aucun décalage de colonnes, pas de contenu à sauver.
    table.querySelectorAll('tbody tr').forEach(tr => {
        // Y a-t-il au moins 1 cellule du bon statut dans une colonne visible ?
        const hasGood = Array.from(
            tr.querySelectorAll('td[data-statut="' + statut + '"]')
        ).some(td => visibleCols.has(parseInt(td.dataset.colIndex)));

        if (!hasGood) {
            // Aucune bonne cellule dans cette ligne → cacher toute la ligne
            tr.style.display = 'none';
            return;
        }

        // Ligne utile → rendre invisibles (mais présentes) les mauvaises cellules
        tr.querySelectorAll('td[data-statut]').forEach(td => {
            const colIdx = parseInt(td.dataset.colIndex);
            if (!visibleCols.has(colIdx)) return; // déjà cachée via col-hidden

            if (td.dataset.statut !== statut) {
                // Cellule du mauvais type : invisible mais garde son espace
                td.style.visibility = 'hidden';
                td.style.background = 'transparent';
                td.style.border     = 'none';
            }
            // Cellule du bon type : déjà visible après réinitialisation
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
// SUPPRESSION — MODAL
// =============================================================================

function openDelModal(id_occupation, cellElement, infoHtml) {
    pendingDelete = { id_occupation, cellElement };
    document.getElementById('delModalInfo').innerHTML = infoHtml;
    document.getElementById('btnConfirmDel').disabled = false;
    document.getElementById('btnConfirmDel').innerHTML = '<i class="fas fa-trash-alt"></i> Supprimer';
    document.getElementById('delOverlay').classList.add('show');
}

function closeDelModal() {
    pendingDelete = null;
    document.getElementById('delOverlay').classList.remove('show');
}

document.getElementById('delOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeDelModal();
});

async function confirmDelete() {
    if (!pendingDelete) return;
    const { id_occupation, cellElement } = pendingDelete;

    const btn = document.getElementById('btnConfirmDel');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';

    try {
        const resp   = await fetch(`/consultation/occupation/${id_occupation}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Erreur serveur');

        // Transformer la cellule en libre
        const colIdx = cellElement.dataset.colIndex;
        cellElement.className = 'cell-libre';
        cellElement.dataset.statut = 'libre';
        if (colIdx) cellElement.dataset.colIndex = colIdx;
        delete cellElement.dataset.id;
        cellElement.innerHTML = `
            <span class="badge-libre">Libre</span>
            <div class="occ-detail" style="color:#166534"><i class="fas fa-check-circle"></i> Disponible</div>
        `;

        updateStats(-1);
        closeDelModal();
        showToast('Occupation supprimée avec succès', 'success');

    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash-alt"></i> Supprimer';
        showToast('Erreur : ' + e.message, 'error');
    }
}

// ===========================================================================================================================
// INIT
// =============================================================================
window.addEventListener('load', () => {
    loadRefData();
    setMode('semaine');
});