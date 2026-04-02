AOS.init({ duration: 600, once: true });

//utiliser bibliotheque Chart.js, pour afficer les diagramme de statistique


document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

Chart.defaults.font.family = "'Segoe UI', sans-serif";
Chart.defaults.color       = '#6b7280';
Chart.defaults.borderColor = '#f0f4f8';

const PALETTE = ['#1a236d', '#2c75bd', '#4f46e5',
  '#6d4fea', '#7c3aed', '#8b5cf6', '#a78bfa'];
let charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

async function api(path) {
    const r = await fetch('/dashboard' + path);
    if (!r.ok) throw new Error('Erreur ' + r.status);
    return r.json();
}

// ── SEMESTRES LISTE ────────────────────────────────────────────────────────
async function loadSemestresOptions() {
    try {
        const parts = await api('/semestres/partitions');

        let optsWithAll = [];
        let optsNoAll = [];
        if (Array.isArray(parts) && parts.length) {
            const partOpts = parts.map(p => `<option value="${p.partit}">${p.label}</option>`);
            optsWithAll = ['<option value="">Toutes</option>'].concat(partOpts);
            optsNoAll = partOpts.slice();
        } else {
            // Fallback: dériver deux parties depuis la liste des semestres (S1/S2/S3 vs S4/S5/S6)
            const sems = await api('/semestres');
            const names = (sems || []).map(s => s.nom_semestre || '').map(n => n.toUpperCase());
            const hasP1 = names.some(n => /S[123]/.test(n));
            const hasP2 = names.some(n => /S[456]/.test(n));
            const derived = [];
            if (hasP1) derived.push({ partit:'1', label:'S1 - S3' });
            if (hasP2) derived.push({ partit:'2', label:'S4 - S6' });
            if (!derived.length) {
                derived.push({ partit:'1', label:'S1 - S3' });
                derived.push({ partit:'2', label:'S4 - S6' });
            }
            const partOpts = derived.map(p => `<option value="${p.partit}">${p.label}</option>`);
            optsWithAll = ['<option value="">Toutes</option>'].concat(partOpts);
            optsNoAll = partOpts.slice();
        }

        const fillWithAll = (el) => { if (el) el.innerHTML = optsWithAll.join(''); };
        const fillNoAll = (el) => { if (el) el.innerHTML = optsNoAll.join(''); };
        fillNoAll(document.getElementById('semSelect'));
        fillWithAll(document.getElementById('semSallesSelect'));
        fillWithAll(document.getElementById('semProfsSelect'));
        fillWithAll(document.getElementById('semLibreSelect'));
        fillNoAll(document.getElementById('semOccSelect'));
    } catch (e) {
        console.error('Semestres partitions load error', e);
        const fallback = [
            '<option value="">Toutes</option>',
            '<option value="1">S1 - S3</option>',
            '<option value="2">S4 - S6</option>'
        ].join('');
        const fallbackNoAll = [
            '<option value="1">S1 - S3</option>',
            '<option value="2">S4 - S6</option>'
        ].join('');
        const fillWithAll = (el) => { if (el) el.innerHTML = fallback; };
        const fillNoAll = (el) => { if (el) el.innerHTML = fallbackNoAll; };
        fillNoAll(document.getElementById('semSelect'));
        fillWithAll(document.getElementById('semSallesSelect'));
        fillWithAll(document.getElementById('semProfsSelect'));
        fillWithAll(document.getElementById('semLibreSelect'));
        fillNoAll(document.getElementById('semOccSelect'));
    }
}

// ── ANNEES LISTE ───────────────────────────────────────────────────────────
async function loadAnneesOptions() {
    try {
        const annees = await api('/annees');
        const opts = ['<option value="">Toutes</option>']
            .concat((annees || []).map(a => `<option value="${a.id_annee}">${a.libelle || 'Année'}</option>`));
        const html = opts.join('');

        const fill = (el) => { if (el) el.innerHTML = html; };
        fill(document.getElementById('anneeSallesSelect'));
        fill(document.getElementById('anneeProfsSelect'));
        fill(document.getElementById('anneeOccSelect'));
        fill(document.getElementById('anneeJourSelect'));
        fill(document.getElementById('anneeRecentSelect'));
    } catch (e) {
        console.error('Annees load error', e);
    }
}

async function loadSemestresList() {
    try {
        const [sems, parts] = await Promise.all([
            api('/semestres'),
            api('/semestres/partitions')
        ]);

        const labelByPart = new Map();
        (parts || []).forEach(p => {
            if (p && p.partit != null) labelByPart.set(String(p.partit), p.label);
        });

        const groups = new Map();
        (sems || []).forEach(s => {
            const key = s && s.type_partit != null ? String(s.type_partit) : '';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(s);
        });

        const semOrder = (name) => {
            const n = String(name || '').match(/\d+/);
            return n ? parseInt(n[0], 10) : Number.MAX_SAFE_INTEGER;
        };
        const formatOpt = (s) => `<option value="${s.id_semestre}">${s.nom_semestre || 'Semestre'}</option>`;

        const groupedKeys = Array.from(groups.keys()).filter(k => k !== '')
            .sort((a, b) => (parseFloat(a) - parseFloat(b)) || a.localeCompare(b));

        const optGroups = groupedKeys.map(k => {
            const label = labelByPart.get(k) || `Partie ${k}`;
            const items = (groups.get(k) || [])
                .sort((a, b) => semOrder(a.nom_semestre) - semOrder(b.nom_semestre)
                    || String(a.nom_semestre).localeCompare(String(b.nom_semestre), 'fr', { sensitivity: 'base' }))
                .map(formatOpt)
                .join('');
            return `<optgroup label="${label}">${items}</optgroup>`;
        });

        const ungrouped = (groups.get('') || [])
            .sort((a, b) => semOrder(a.nom_semestre) - semOrder(b.nom_semestre)
                || String(a.nom_semestre).localeCompare(String(b.nom_semestre), 'fr', { sensitivity: 'base' }))
            .map(formatOpt);

        const html = []
            .concat(optGroups)
            .concat(ungrouped)
            .join('');

        const el = document.getElementById('semOccSelect');
        if (el) el.innerHTML = html;
    } catch (e) {
        console.error('Semestres list load error', e);
    }
}

async function loadSemainesOptions(partitValue, targetSelectId = 'semaineOccSelect') {
    try {
        const partit = typeof partitValue === 'string' ? partitValue : (document.getElementById('semOccSelect')?.value || '');
        const qs = new URLSearchParams({ partit });
        const semaines = await api(`/semaines?${qs.toString()}`);
        const uniqByName = new Map();
        (semaines || []).forEach((s) => {
            const label = String(s.nom_semaine || '').trim();
            if (!label) return;
            const key = label.toLowerCase();
            if (!uniqByName.has(key)) {
                uniqByName.set(key, label);
            }
        });
        const opts = ['<option value="">Toutes</option>']
            .concat(Array.from(uniqByName.values()).map(name => `<option value="${name}">${name}</option>`));
        const html = opts.join('');
        const el = document.getElementById(targetSelectId);
        if (el) el.innerHTML = html;
    } catch (e) {
        console.error('Semaines load error', e);
    }
}

async function loadFilieresOptions() {
    try {
        const filieres = await api('/filieres');
        const opts = ['<option value="">Toutes</option>']
            .concat((filieres || []).map(f => `<option value="${f.id_filiere}">${f.label || f.nom_filiere || 'Filière'}</option>`));
        const html = opts.join('');

        const fill = (el) => { if (el) el.innerHTML = html; };
        fill(document.getElementById('filiereSallesSelect'));
        fill(document.getElementById('filiereProfsSelect'));
    } catch (e) {
        console.error('Filieres load error', e);
    }
}

// ── KPI ───────────────────────────────────────────────────────────────────────
async function loadStats() {
    const s = await api('/stats');
    const configs = [
        { cls:'kpi-blue',   icon:'fa-door-open',          val:s.salles,      lbl:'Salles',       sub:'Espaces disponibles' },
        { cls:'kpi-cyan',   icon:'fa-chalkboard-teacher', val:s.professeurs, lbl:'Professeurs',  sub:'Corps enseignant' },
        { cls:'kpi-green',  icon:'fa-graduation-cap',     val:s.filieres,    lbl:'Filières',     sub:`${s.groupes||'—'} groupes` },
        { cls:'kpi-amber',  icon:'fa-book-open',          val:s.modules,     lbl:'Modules',      sub:"Unités d'enseignement" },
        { cls:'kpi-red',    icon:'fa-calendar-check',     val:s.occupations, lbl:'Utilisations',  sub:'Réservations' },
        { cls:'kpi-purple', icon:'fa-calendar-week',      val:s.semaines,    lbl:'Semaines',     sub:'Plage calendaire' },
    ];
    document.getElementById('kpiRow').innerHTML = configs.map(c => `
        <div class="col-lg-2 col-md-4 col-6">
            <div class="kpi-card ${c.cls}">
                <div class="kpi-icon"><i class="fas ${c.icon}"></i></div>
                <div class="kpi-info">
                    <h3 data-target="${c.val}">0</h3>
                    <p>${c.lbl}</p>
                    <small>${c.sub}</small>
                </div>
            </div>
        </div>`).join('');

    document.querySelectorAll('[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target) || 0;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 40));
        const t = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = cur.toLocaleString('fr-FR');
            if (cur >= target) clearInterval(t);
        }, 20);
    });
}

// ── Chart : Salles par semestre ─────────────────────────────────────────────
async function loadChartSallesSem(partit) {
    const sel = partit || (document.getElementById('semSallesSelect')?.value || '');
    const filiere = document.getElementById('filiereSallesSelect')?.value || '';
    const annee = document.getElementById('anneeSallesSelect')?.value || '';
    const qs = new URLSearchParams({ partit: sel, filiere, annee });
    const rows = await api(`/salles-par-semestre?${qs.toString()}`);
    destroyChart('sallesSem');
    charts['sallesSem'] = new Chart(document.getElementById('chartSallesSem'), {
        type: 'bar',
        data: {
            labels: rows.map(r => `${r.nom_semestre || 'Semestre ?'} · ${r.nom_salle || 'Salle ?'}`),
            datasets: [{
                label: 'Utilisations',
                data: rows.map(r => r.nb),
                backgroundColor: rows.map((_,i) => PALETTE[i % PALETTE.length] + 'cc'),
                borderColor: rows.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{ x:{ beginAtZero:true, ticks:{ precision:0 } }, y:{ ticks:{ font:{ size:11 } } } }
        }
    });
}

// ── Chart : Profs par semestre ─────────────────────────────────────────────
async function loadChartProfsSem(partit) {
    const sel = partit || (document.getElementById('semProfsSelect')?.value || '');
    const filiere = document.getElementById('filiereProfsSelect')?.value || '';
    const annee = document.getElementById('anneeProfsSelect')?.value || '';
    const qs = new URLSearchParams({ partit: sel, filiere, annee });
    const rows = await api(`/profs-par-semestre?${qs.toString()}`);
    destroyChart('profsSem');
    charts['profsSem'] = new Chart(document.getElementById('chartProfsSem'), {
        type: 'bar',
        data: {
            labels: rows.map(r => `${r.nom_semestre || 'Semestre ?'} · ${r.professeur || 'Prof ?'}`),
            datasets: [{
                label: 'Utilisations',
                data: rows.map(r => r.nb),
                backgroundColor: rows.map((_,i) => PALETTE[(i+2) % PALETTE.length] + 'cc'),
                borderColor: rows.map((_,i) => PALETTE[(i+2) % PALETTE.length]),
                borderWidth: 2,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{ x:{ beginAtZero:true, ticks:{ precision:0 } }, y:{ ticks:{ font:{ size:11 } } } }
        }
    });
}

// ── Tableau : Occupation des salles par semaine ─────────────────────────────
async function loadSallesOccupationSemaine() {
    const annee = document.getElementById('anneeOccSelect')?.value || '';
    const partit = document.getElementById('semOccSelect')?.value || '';
    const semaineNom = document.getElementById('semaineOccSelect')?.value || '';
    const qs = new URLSearchParams({ annee, partit, semaineNom });
    const { totalSlots, data } = await api(`/salles-occupation-semaine?${qs.toString()}`);
    const rows = data.map((r,i) => {
        const color = PALETTE[i % PALETTE.length];
        const pctOcc = totalSlots > 0 ? Math.round((r.occupes / totalSlots) * 100) : 0;
        return `<tr>
            <td>${r.nom_salle}</td>
            <td>
                <div class="bar-track" style="height:10px"><div class="bar-fill" style="width:${pctOcc}%;background:${color}"></div></div>
                <span style="font-size:.8rem;color:#6b7280">utilisation ${pctOcc}%</span>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('sallesOccupeesBody').innerHTML = `
        <div style="overflow-x:auto">
            <table class="recent-table">
                <thead><tr><th>Salle</th><th>Taux (utilisation)</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="2" style="text-align:center;padding:1rem;color:#9ca3af">Aucune donnée</td></tr>'}</tbody>
            </table>
        </div>`;
}

// ── Tableau : Occupations par jour (salle × semestre) ─────────────────────
async function loadJourSalleSemestre(jour, partit, annee, semaineNom) {
    const selectJour = document.getElementById('jourSelect');
    const selectSem  = document.getElementById('semSelect');
    const selectAnnee = document.getElementById('anneeJourSelect');
    const selectSemaine = document.getElementById('semaineJourSelect');
    const chosenJour = jour || (selectJour ? selectJour.value : 'Lundi');
    const chosenPart = partit || (selectSem ? selectSem.value : '');
    const chosenAnnee = annee || (selectAnnee ? selectAnnee.value : '');
    const chosenSemaineNom = typeof semaineNom === 'string'
        ? semaineNom
        : (selectSemaine ? selectSemaine.value : '');
    if (selectJour && selectJour.value !== chosenJour) selectJour.value = chosenJour;
    if (selectSem && selectSem.value !== chosenPart)   selectSem.value  = chosenPart;
    if (selectAnnee && selectAnnee.value !== chosenAnnee) selectAnnee.value = chosenAnnee;
    if (selectSemaine && selectSemaine.value !== chosenSemaineNom) selectSemaine.value = chosenSemaineNom;

    const qs = new URLSearchParams({
        jour: chosenJour,
        partit: chosenPart,
        annee: chosenAnnee,
        semaineNom: chosenSemaineNom
    });
    const response = await api(`/jour-salle-semestre?${qs.toString()}`);
    const rows = Array.isArray(response) ? response : (response.data || []);
    const totalSlots = Array.isArray(response) ? 0 : (Number(response.totalSlots) || 0);
    const body = document.getElementById('jourSalleBody');
    body.innerHTML = rows.map((r,i) => {
        const pct = Number.isFinite(r.taux)
            ? Math.max(0, Math.min(100, Math.round(Number(r.taux))))
            : (totalSlots > 0 ? Math.round(((Number(r.total) || 0) / totalSlots) * 100) : 0);
        const color = PALETTE[i % PALETTE.length];
        const detail = (r.filieres || []).map(f => {
            const filierePct = Number.isFinite(f.taux)
                ? Math.max(0, Math.min(100, Math.round(Number(f.taux))))
                : (totalSlots > 0 ? Math.round(((Number(f.nb) || 0) / totalSlots) * 100) : 0);
            return `<span class="badge" style="background:${color}15;color:${color};border:1px solid ${color}33;border-radius:12px;padding:2px 8px;font-size:12px;display:inline-block;margin:2px 4px 2px 0">${f.nom} · ${filierePct}%</span>`;
        }).join('') || '<span style="color:#9ca3af">Aucune filière</span>';
        return `<tr>
            <td>${r.nom_salle || 'Salle ?'}</td>
            <td>${detail}</td>
            <td>
                <div class="bar-track" style="height:10px"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                <span style="font-size:.82rem;color:#6b7280">${pct}% utilisation</span>
            </td>
        </tr>`;
    }).join('');
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:#9ca3af">Aucune utilisation pour ce jour</td></tr>`;
    }
}

// ── Activité Récente ─────────────────────────────────────────────────────────
async function loadRecent() {
    const annee = document.getElementById('anneeRecentSelect')?.value || '';
    const rows = await api(`/recent?annee=${encodeURIComponent(annee)}`);
    const body = document.getElementById('recentBody');
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#9ca3af">Aucune utilisation</td></tr>`;
        return;
    }
    body.innerHTML = rows.map(r => `<tr>
        <td><span class="badge-jour">${r.jour}</span></td>
        <td><span class="badge-creneau">${r.creneau||'—'}</span></td>
        <td><span class="badge-salle">${r.salle||'—'}</span></td>
        <td style="color:#6b7280">${r.module||'—'}</td>
        <td>${r.filiere||'—'} <span style="color:#9ca3af">Gr.${r.group||'?'}</span></td>
        <td><i class="fas fa-user-tie me-1" style="color:#9ca3af;font-size:.7rem"></i>${r.professeur||'—'}</td>
        <td style="font-size:.72rem;color:#9ca3af;white-space:nowrap">${r.semaine_debut||'?'} → ${r.semaine_fin||'?'}</td>
        <td style="font-size:.72rem;color:#9ca3af">${r.date_creation ? new Date(r.date_creation).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`).join('');
}

// ── LOAD ALL ─────────────────────────────────────────────────────────────────
async function loadAll() {
    try {
        await loadSemestresOptions();
        await loadAnneesOptions();
        await loadFilieresOptions();
        await loadSemainesOptions();
        await loadSemainesOptions(document.getElementById('semSelect')?.value || '', 'semaineJourSelect');
        await Promise.all([
            loadStats(),
            loadChartSallesSem(),
            loadChartProfsSem(),
            loadSallesOccupationSemaine(),
            loadJourSalleSemestre(),
            loadRecent(),
        ]);
    } catch(e) {
        console.error('Dashboard error:', e);
    }
}

window.addEventListener('load', () => {
    const selectJour = document.getElementById('jourSelect');
    const selectSemJour  = document.getElementById('semSelect');
    const selectSemSalles = document.getElementById('semSallesSelect');
    const selectSemProfs  = document.getElementById('semProfsSelect');
    const selectFiliereSalles = document.getElementById('filiereSallesSelect');
    const selectFiliereProfs = document.getElementById('filiereProfsSelect');
    const selectSemOcc  = document.getElementById('semOccSelect');
    const selectSemaineOcc = document.getElementById('semaineOccSelect');
    const selectSemaineJour = document.getElementById('semaineJourSelect');
    const selectAnneeSalles = document.getElementById('anneeSallesSelect');
    const selectAnneeProfs = document.getElementById('anneeProfsSelect');
    const selectAnneeOcc = document.getElementById('anneeOccSelect');
    const selectAnneeJour = document.getElementById('anneeJourSelect');
    const selectAnneeRecent = document.getElementById('anneeRecentSelect');

    if (selectJour) selectJour.addEventListener('change', e => loadJourSalleSemestre(e.target.value, selectSemJour ? selectSemJour.value : '', selectAnneeJour ? selectAnneeJour.value : '', selectSemaineJour ? selectSemaineJour.value : ''));
    if (selectSemJour)  selectSemJour.addEventListener('change', async (e) => {
        await loadSemainesOptions(e.target.value, 'semaineJourSelect');
        loadJourSalleSemestre(selectJour ? selectJour.value : 'Lundi', e.target.value, selectAnneeJour ? selectAnneeJour.value : '', selectSemaineJour ? selectSemaineJour.value : '');
    });
    if (selectSemaineJour) selectSemaineJour.addEventListener('change', e => loadJourSalleSemestre(selectJour ? selectJour.value : 'Lundi', selectSemJour ? selectSemJour.value : '', selectAnneeJour ? selectAnneeJour.value : '', e.target.value));
    if (selectSemSalles) selectSemSalles.addEventListener('change', e => loadChartSallesSem(e.target.value));
    if (selectSemProfs)  selectSemProfs.addEventListener('change',  e => loadChartProfsSem(e.target.value));
    if (selectFiliereSalles) selectFiliereSalles.addEventListener('change', () => loadChartSallesSem(selectSemSalles ? selectSemSalles.value : ''));
    if (selectFiliereProfs) selectFiliereProfs.addEventListener('change', () => loadChartProfsSem(selectSemProfs ? selectSemProfs.value : ''));
    if (selectSemOcc) selectSemOcc.addEventListener('change', async (e) => {
        await loadSemainesOptions(e.target.value);
        loadSallesOccupationSemaine();
    });
    if (selectSemaineOcc) selectSemaineOcc.addEventListener('change', () => loadSallesOccupationSemaine());
    if (selectAnneeSalles) selectAnneeSalles.addEventListener('change', () => loadChartSallesSem(selectSemSalles ? selectSemSalles.value : ''));
    if (selectAnneeProfs) selectAnneeProfs.addEventListener('change', () => loadChartProfsSem(selectSemProfs ? selectSemProfs.value : ''));
    if (selectAnneeOcc) selectAnneeOcc.addEventListener('change', () => loadSallesOccupationSemaine());
    if (selectAnneeJour) selectAnneeJour.addEventListener('change', () => loadJourSalleSemestre(selectJour ? selectJour.value : 'Lundi', selectSemJour ? selectSemJour.value : '', selectAnneeJour.value, selectSemaineJour ? selectSemaineJour.value : ''));
    if (selectAnneeRecent) selectAnneeRecent.addEventListener('change', () => loadRecent());

    loadAll();
});