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

        let opts = [];
        if (Array.isArray(parts) && parts.length) {
            opts = ['<option value="">Toutes</option>']
                .concat(parts.map(p => `<option value="${p.partit}">${p.label}</option>`));
        } else {
            // Fallback: dériver deux parties depuis la liste des semestres (S1/S2/S3 vs S4/S5/S6)
            const sems = await api('/semestres');
            const names = (sems || []).map(s => s.nom_semestre || '').map(n => n.toUpperCase());
            const hasP1 = names.some(n => /S[123]/.test(n));
            const hasP2 = names.some(n => /S[456]/.test(n));
            const derived = [];
            if (hasP1) derived.push({ partit:'partit 1', label:'S1 - S3' });
            if (hasP2) derived.push({ partit:'partit 2', label:'S4 - S6' });
            if (!derived.length) {
                derived.push({ partit:'partit 1', label:'S1 - S3' });
                derived.push({ partit:'partit 2', label:'S4 - S6' });
            }
            opts = ['<option value="">Toutes</option>']
                .concat(derived.map(p => `<option value="${p.partit}">${p.label}</option>`));
        }

        const fill = (el) => { if (el) el.innerHTML = opts.join(''); };
        fill(document.getElementById('semSelect'));
        fill(document.getElementById('semSallesSelect'));
        fill(document.getElementById('semProfsSelect'));
        fill(document.getElementById('semLibreSelect'));
    } catch (e) {
        console.error('Semestres partitions load error', e);
        const fallback = [
            '<option value="">Toutes</option>',
            '<option value="partit 1">S1 - S3</option>',
            '<option value="partit 2">S4 - S6</option>'
        ].join('');
        const fill = (el) => { if (el) el.innerHTML = fallback; };
        fill(document.getElementById('semSelect'));
        fill(document.getElementById('semSallesSelect'));
        fill(document.getElementById('semProfsSelect'));
        fill(document.getElementById('semLibreSelect'));
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
    const rows = await api(`/salles-par-semestre?partit=${encodeURIComponent(sel)}`);
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
    const rows = await api(`/profs-par-semestre?partit=${encodeURIComponent(sel)}`);
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

// ── Tableau : Libre / occupé par salle ──────────────────────────────────────
async function loadSallesLibreOccupee(partit, jour) {
    const partVal = typeof partit === 'string' ? partit : (document.getElementById('semLibreSelect')?.value || '');
    const jourVal = typeof jour === 'string' ? jour : (document.getElementById('jourLibreSelect')?.value || '');
    const qs = new URLSearchParams({ partit: partVal, jour: jourVal });
    const { totalSlots, data } = await api(`/salles-libre-occupee?${qs.toString()}`);
    const max = Math.max(...data.map(d => d.occupes), 1);
    const rows = data.map((r,i) => {
        const color = PALETTE[i % PALETTE.length];
        const pctOcc = totalSlots > 0 ? Math.round((r.occupes / totalSlots) * 100) : 0;
        return `<tr>
            <td>${r.nom_salle}</td>
            <td>${r.occupes}</td>
            <td>${r.libres}</td>
            <td>
                <div class="bar-track" style="height:10px"><div class="bar-fill" style="width:${pctOcc}%;background:${color}"></div></div>
                <span style="font-size:.8rem;color:#6b7280">${pctOcc}% occupé</span>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('sallesOccupeesBody').innerHTML = `
        <div style="overflow-x:auto">
            <table class="recent-table">
                <thead><tr><th>Salle</th><th>Occupé</th><th>Libre</th><th>Taux</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#9ca3af">Aucune donnée</td></tr>'}</tbody>
            </table>
        </div>`;
}

// ── Tableau : Occupations par jour (salle × semestre) ─────────────────────
async function loadJourSalleSemestre(jour, partit) {
    const selectJour = document.getElementById('jourSelect');
    const selectSem  = document.getElementById('semSelect');
    const chosenJour = jour || (selectJour ? selectJour.value : 'Lundi');
    const chosenPart = partit || (selectSem ? selectSem.value : '');
    if (selectJour && selectJour.value !== chosenJour) selectJour.value = chosenJour;
    if (selectSem && selectSem.value !== chosenPart)   selectSem.value  = chosenPart;

    const rows = await api(`/jour-salle-semestre?jour=${encodeURIComponent(chosenJour)}&partit=${encodeURIComponent(chosenPart)}`);
    const body = document.getElementById('jourSalleBody');
    const max = Math.max(...rows.map(r => r.total), 1);
    body.innerHTML = rows.map((r,i) => {
        const pct = Math.round((r.total / max) * 100);
        const color = PALETTE[i % PALETTE.length];
        const detail = (r.filieres || []).map(f => `<span class="badge" style="background:${color}15;color:${color};border:1px solid ${color}33;border-radius:12px;padding:2px 8px;font-size:12px;display:inline-block;margin:2px 4px 2px 0">${f.nom} · ${f.nb}</span>`).join('') || '<span style="color:#9ca3af">Aucune filière</span>';
        return `<tr>
            <td>${r.nom_salle || 'Salle ?'}</td>
            <td>${detail}</td>
            <td>
                <div class="bar-track" style="height:10px"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
                <span style="font-size:.82rem;color:#6b7280">${r.total} utilisations</span>
            </td>
        </tr>`;
    }).join('');
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:#9ca3af">Aucune utilisation pour ce jour</td></tr>`;
    }
}

// ── Activité Récente ─────────────────────────────────────────────────────────
async function loadRecent() {
    const rows = await api('/recent');
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
        await Promise.all([
            loadStats(),
            loadChartSallesSem(),
            loadChartProfsSem(),
            loadSallesLibreOccupee(),
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
    const selectSemLibre  = document.getElementById('semLibreSelect');
    const selectJourLibre = document.getElementById('jourLibreSelect');

    if (selectJour) selectJour.addEventListener('change', e => loadJourSalleSemestre(e.target.value, selectSemJour ? selectSemJour.value : ''));
    if (selectSemJour)  selectSemJour.addEventListener('change',  e => loadJourSalleSemestre(selectJour ? selectJour.value : 'Lundi', e.target.value));
    if (selectSemSalles) selectSemSalles.addEventListener('change', e => loadChartSallesSem(e.target.value));
    if (selectSemProfs)  selectSemProfs.addEventListener('change',  e => loadChartProfsSem(e.target.value));
    if (selectSemLibre)  selectSemLibre.addEventListener('change',  e => loadSallesLibreOccupee(e.target.value, selectJourLibre ? selectJourLibre.value : ''));
    if (selectJourLibre) selectJourLibre.addEventListener('change', e => loadSallesLibreOccupee(selectSemLibre ? selectSemLibre.value : '', e.target.value));

    loadAll();
});