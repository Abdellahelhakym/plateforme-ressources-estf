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

// ── KPI ───────────────────────────────────────────────────────────────────────
async function loadStats() {
    const s = await api('/stats');
    const configs = [
        { cls:'kpi-blue',   icon:'fa-door-open',          val:s.salles,      lbl:'Salles',       sub:'Espaces disponibles' },
        { cls:'kpi-cyan',   icon:'fa-chalkboard-teacher', val:s.professeurs, lbl:'Professeurs',  sub:'Corps enseignant' },
        { cls:'kpi-green',  icon:'fa-graduation-cap',     val:s.filieres,    lbl:'Filières',     sub:`${s.groupes||'—'} groupes` },
        { cls:'kpi-amber',  icon:'fa-book-open',          val:s.modules,     lbl:'Modules',      sub:"Unités d'enseignement" },
        { cls:'kpi-red',    icon:'fa-calendar-check',     val:s.occupations, lbl:'Occupations',  sub:'Réservations' },
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

// ── Chart : par Jour ──────────────────────────────────────────────────────────
async function loadChartJour() {
    const { data } = await api('/taux-par-jour');
    destroyChart('jour');
    charts['jour'] = new Chart(document.getElementById('chartJour'), {
        type: 'bar',
        data: {
            labels: data.map(d => d.jour),
            datasets: [{
                label: "Nombre d'occupations",
                data:  data.map(d => d.nb),
                backgroundColor: data.map((_,i) => PALETTE[i % PALETTE.length] + 'bb'),
                borderColor:     data.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2, borderRadius: 8, borderSkipped: false,
            }]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, ticks:{ precision:0 } } }
        }
    });
}

// ── Chart : par Filière ───────────────────────────────────────────────────────
async function loadChartFiliere() {
    const rows = await api('/par-filiere');
    destroyChart('filiere');
    charts['filiere'] = new Chart(document.getElementById('chartFiliere'), {
        type: 'doughnut',
        data: {
            labels: rows.map(r => r.nom_filiere),
            datasets: [{
                data: rows.map(r => r.nb),
                backgroundColor: rows.map((_,i) => PALETTE[i % PALETTE.length] + 'bb'),
                borderColor:     rows.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2, hoverOffset: 6,
            }]
        },
        options: {
            responsive:true, maintainAspectRatio:false, cutout:'62%',
            plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, padding:8, font:{ size:10 } } } }
        }
    });
}

// ── Chart : par Semaine ───────────────────────────────────────────────────────
async function loadChartSemaine() {
    const rows = await api('/par-semaine');
    const slice = rows.slice(-16);
    destroyChart('semaine');
    charts['semaine'] = new Chart(document.getElementById('chartSemaine'), {
        type: 'line',
        data: {
            labels: slice.map(r => r.nom_semaine),
            datasets: [{
                label: 'Occupations',
                data:  slice.map(r => r.nb_occupations),
                borderColor: '#2c75bd',
                backgroundColor: 'rgba(44,117,189,.08)',
                borderWidth: 2.5, tension: 0.4, fill: true,
                pointBackgroundColor: '#2c75bd', pointRadius: 4, pointHoverRadius: 6,
            }]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{
                x:{ grid:{ display:false }, ticks:{ maxTicksLimit:8, font:{ size:10 } } },
                y:{ beginAtZero:true, ticks:{ precision:0 } }
            }
        }
    });
}

// ── Créneaux ─────────────────────────────────────────────────────────────────
async function loadCreneaux() {
    const rows = await api('/par-creneau');
    const max  = Math.max(...rows.map(r => r.nb), 1);
    const colors = ['#1a236d','#2c75bd','#10b981','#f59e0b','#ef4444','#8b5cf6'];
    document.getElementById('creneauxBody').innerHTML = rows.map((r,i) => {
        const pct = Math.round((r.nb / max) * 100);
        const c = colors[i % colors.length];
        return `<div class="cr-row">
            <div class="cr-label"><i class="fas fa-clock me-1" style="color:${c}"></i>${r.label}</div>
            <div class="cr-track"><div class="cr-fill" style="width:${pct}%;background:${c}"></div></div>
            <div class="cr-count" style="color:${c}">${r.nb}</div>
        </div>`;
    }).join('');
}

// ── Top Salles ───────────────────────────────────────────────────────────────
async function loadTopSalles() {
    const rows = await api('/top-salles');
    const max  = Math.max(...rows.map(r => r.nb), 1);
    document.getElementById('topSallesBody').innerHTML =
        `<div class="bar-list">${rows.map((r,i) => barRow(r.nom_salle, r.nb, max, PALETTE[i%PALETTE.length])).join('')}</div>`;
}

// ── Top Profs ────────────────────────────────────────────────────────────────
async function loadTopProfs() {
    const rows = await api('/top-profs');
    const max  = Math.max(...rows.map(r => r.nb), 1);
    document.getElementById('topProfsBody').innerHTML =
        `<div class="bar-list">${rows.map((r,i) => barRow(r.nom_complet, r.nb, max, PALETTE[(i+2)%PALETTE.length])).join('')}</div>`;
}

function barRow(name, val, max, color) {
    const pct = Math.round((val / max) * 100);
    return `<div class="bar-row">
        <div class="bar-row-top">
            <span class="bar-name">${name}</span>
            <span class="bar-val">${val} séance${val>1?'s':''}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
}

// ── Activité Récente ─────────────────────────────────────────────────────────
async function loadRecent() {
    const rows = await api('/recent');
    const body = document.getElementById('recentBody');
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#9ca3af">Aucune occupation</td></tr>`;
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
        await Promise.all([
            loadStats(),
            loadChartJour(),
            loadChartFiliere(),
            loadChartSemaine(),
            loadCreneaux(),
            loadTopSalles(),
            loadTopProfs(),
            loadRecent(),
        ]);
    } catch(e) {
        console.error('Dashboard error:', e);
    }
}

window.addEventListener('load', loadAll);