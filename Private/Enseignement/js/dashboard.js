AOS.init({ duration: 600, once: true });

document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

Chart.defaults.font.family = "'Segoe UI', sans-serif";
Chart.defaults.color       = '#6b7280';
Chart.defaults.borderColor = '#f0f4f8';

const PALETTE = ['#1a236d', '#2c75bd', '#4f46e5', '#10b981', '#f59e0b', '#ef4444'];
let charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

async function api(path) {
    const r = await fetch('/dashboard' + path);
    if (!r.ok) throw new Error('Erreur ' + r.status);
    return r.json();
}

function getFilterValues(anneeId, partitId) {
    return {
        annee: document.getElementById(anneeId)?.value || '',
        partit: document.getElementById(partitId)?.value || ''
    };
}

function withFilters(path, anneeId, partitId) {
    const { annee, partit } = getFilterValues(anneeId, partitId);
    const qs = new URLSearchParams({ annee, partit });
    return `${path}?${qs.toString()}`;
}

async function loadAnneesOptions(targetIds) {
    try {
        const annees = await api('/annees');
        const opts = ['<option value="">Toutes</option>']
            .concat((annees || []).map(a => `<option value="${a.id_annee}">${a.libelle || 'Année'}</option>`));
        const html = opts.join('');
        (targetIds || []).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });
    } catch (e) {
        console.error('Annees load error', e);
    }
}

async function loadPartitOptions(targetIds) {
    try {
        const parts = await api('/semestres/partitions');
        let opts = [];
        if (Array.isArray(parts) && parts.length) {
            opts = ['<option value="">Toutes</option>']
                .concat(parts.map(p => `<option value="${p.partit}">${p.label}</option>`));
        } else {
            opts = [
                '<option value="">Toutes</option>',
                '<option value="partit 1">S1 - S3</option>',
                '<option value="partit 2">S4 - S6</option>'
            ];
        }
        const html = opts.join('');
        (targetIds || []).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });
    } catch (e) {
        console.error('Partit load error', e);
    }
}

async function loadStats() {
    const s = await api('/enseignant/stats');
    const configs = [
        { cls:'kpi-blue',   icon:'fa-calendar-check',     val:s.utilisations, lbl:'Utilisations', sub:'Mes cours planifies' },
        { cls:'kpi-cyan',   icon:'fa-graduation-cap',     val:s.filieres,     lbl:'Filieres',     sub:'Filieres enseignees' },
        { cls:'kpi-green',  icon:'fa-door-open',          val:s.salles,       lbl:'Salles',       sub:'Salles utilisees' },
        { cls:'kpi-amber',  icon:'fa-book-open',          val:s.modules,      lbl:'Modules',      sub:"Modules enseignes" },
        { cls:'kpi-red',    icon:'fa-calendar-week',      val:s.semestres,    lbl:'Semestres',    sub:'Semestres actifs' },
        { cls:'kpi-purple', icon:'fa-calendar-day',       val:s.jours,        lbl:'Jours',        sub:'Jours enseignes' },
    ];
    document.getElementById('kpiRow').innerHTML = configs.map(c => `
        <div class="col-lg-2 col-md-4 col-6">
            <div class="kpi-card ${c.cls}">
                <div class="kpi-icon"><i class="fas ${c.icon}"></i></div>
                <div class="kpi-info">
                    <h3>${Number(c.val || 0).toLocaleString('fr-FR')}</h3>
                    <p>${c.lbl}</p>
                    <small>${c.sub}</small>
                </div>
            </div>
        </div>`).join('');
}

async function loadChartFilieres() {
    const rows = await api(withFilters('/enseignant/filieres', 'anneeFilieresEnsSelect', 'partitFilieresEnsSelect'));
    destroyChart('filieresEns');
    charts['filieresEns'] = new Chart(document.getElementById('chartFilieresEns'), {
        type: 'doughnut',
        data: {
            labels: rows.map(r => r.filiere || 'Filiere ?'),
            datasets: [{
                data: rows.map(r => Number(r.nb) || 0),
                backgroundColor: rows.map((_,i) => PALETTE[i % PALETTE.length] + 'cc'),
                borderColor: rows.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } } }
        }
    });
}

async function loadChartSalles() {
    const rows = await api(withFilters('/enseignant/salles', 'anneeSallesEnsSelect', 'partitSallesEnsSelect'));
    destroyChart('sallesEns');
    charts['sallesEns'] = new Chart(document.getElementById('chartSallesEns'), {
        type: 'bar',
        data: {
            labels: rows.map(r => r.nom_salle || 'Salle ?'),
            datasets: [{
                label: 'Utilisations',
                data: rows.map(r => Number(r.nb) || 0),
                backgroundColor: rows.map((_,i) => PALETTE[i % PALETTE.length] + 'cc'),
                borderColor: rows.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

async function loadChartJours() {
    const rows = await api(withFilters('/enseignant/jours', 'anneeJoursEnsSelect', 'partitJoursEnsSelect'));
    destroyChart('joursEns');
    charts['joursEns'] = new Chart(document.getElementById('chartJoursEns'), {
        type: 'bar',
        data: {
            labels: rows.map(r => r.jour),
            datasets: [{
                label: 'Utilisations',
                data: rows.map(r => Number(r.nb) || 0),
                backgroundColor: rows.map((_,i) => PALETTE[i % PALETTE.length] + 'cc'),
                borderColor: rows.map((_,i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

async function loadEmploi() {
    const rows = await api(withFilters('/enseignant/emploi', 'anneeEmploiEnsSelect', 'partitEmploiEnsSelect'));
    const body = document.getElementById('emploiRows');
    if (!rows.length) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#9ca3af">Aucun emploi du temps trouve</td></tr>';
        return;
    }
    body.innerHTML = rows.map(r => `
        <tr>
            <td><span class="badge-jour">${r.jour || '—'}</span></td>
            <td><span class="badge-creneau">${r.creneau || '—'}</span></td>
            <td><span class="badge-salle">${r.salle || '—'}</span></td>
            <td style="color:#6b7280">${r.module || '—'}</td>
            <td>${r.filiere || '—'} <span style="color:#9ca3af">Gr.${r.grp || '?'}</span></td>
            <td style="font-size:.72rem;color:#9ca3af;white-space:nowrap">${r.semaine_debut || '?'} → ${r.semaine_fin || '?'}</td>
        </tr>
    `).join('');
}

async function loadRecent() {
    const rows = await api(withFilters('/enseignant/recent', 'anneeRecentEnsSelect', 'partitRecentEnsSelect'));
    const body = document.getElementById('recentBody');
    if (!rows.length) {
        body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#9ca3af">Aucune utilisation</td></tr>';
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

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadChartFilieres(),
            loadChartSalles(),
            loadChartJours(),
            loadEmploi(),
            loadRecent(),
        ]);
    } catch (e) {
        console.error('Dashboard enseignant error:', e);
    }
}

async function loadAll() {
    await loadAnneesOptions([
        'anneeFilieresEnsSelect',
        'anneeSallesEnsSelect',
        'anneeJoursEnsSelect',
        'anneeEmploiEnsSelect',
        'anneeRecentEnsSelect'
    ]);
    await loadPartitOptions([
        'partitFilieresEnsSelect',
        'partitSallesEnsSelect',
        'partitJoursEnsSelect',
        'partitEmploiEnsSelect',
        'partitRecentEnsSelect'
    ]);
    await loadDashboardData();
}

window.addEventListener('load', () => {
    const bind = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handler);
    };
    bind('anneeFilieresEnsSelect', loadChartFilieres);
    bind('partitFilieresEnsSelect', loadChartFilieres);
    bind('anneeSallesEnsSelect', loadChartSalles);
    bind('partitSallesEnsSelect', loadChartSalles);
    bind('anneeJoursEnsSelect', loadChartJours);
    bind('partitJoursEnsSelect', loadChartJours);
    bind('anneeEmploiEnsSelect', loadEmploi);
    bind('partitEmploiEnsSelect', loadEmploi);
    bind('anneeRecentEnsSelect', loadRecent);
    bind('partitRecentEnsSelect', loadRecent);
    loadAll();
});