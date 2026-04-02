AOS.init({ duration: 800, once: true });

        // ── Variables suppression ──────────────────────────────────
        let deleteEndpoint = null;
        let deleteId       = null;
        let deleteReload   = null;

        // ── Données semestres en mémoire ───────────────────────────
        let semestresData = [];
        // ── Toutes les semaines en mémoire (pour le filtre) ────────
        let seminesAllData = [];

        function parseDayMonthToIso(input) {
            const raw = String(input || '').trim();
            const m = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
            if (!m) return null;
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10);
            if (month < 1 || month > 12 || day < 1 || day > 31) return null;

            // Année de référence académique pour réutiliser le même calendrier chaque année.
            const year = month >= 9 ? 2000 : 2001;
            const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const d = new Date(`${iso}T00:00:00`);
            if (Number.isNaN(d.getTime())) return null;
            if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
            return iso;
        }

        function formatIsoToDayMonth(isoLike) {
            const raw = String(isoLike || '').trim();
            const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!m) return '-';
            return `${m[3]}/${m[2]}`;
        }

        // ══════════════════════════════════════════════════════════
        // UTILITAIRE : peupler un <select> depuis un tableau
        // ══════════════════════════════════════════════════════════
        function fillSelect(selectEl, data, valKey, labelKey, placeholder = '-- Choisir --') {
            selectEl.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value       = item[valKey];
                opt.textContent = item[labelKey];
                selectEl.appendChild(opt);
            });
        }

        // ══════════════════════════════════════════════════════════
        // CHARGEMENT DES DONNÉES
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
                        <div class="card-actions">
                            <button class="btn btn-sm btn-edit btn-edit-annee"
                                data-id="${item.id_annee}"
                                data-libelle="${item.libelle}">
                                <i class="fas fa-edit"></i> Modifier
                            </button>
                            <button class="btn btn-sm btn-delete btn-del"
                                data-endpoint="annee"
                                data-id="${item.id_annee}"
                                data-name="${item.libelle}">
                                <i class="fas fa-trash"></i> Supprimer
                            </button>
                        </div>
                    </div>
                `;
                row.appendChild(col);
            });
        }

        async function loadSemestres() {
            const res  = await fetch('/config/semestre');
            const data = await res.json();
            semestresData = data;

            // Table
            const tbody = document.getElementById('tbodySemestres');
            tbody.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom_semestre}</td>
                    <td><span class="badge bg-secondary">${item.type_partit || '—'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-edit btn-edit-semestre"
                            data-id="${item.id_semestre}"
                            data-nom="${item.nom_semestre}"
                            data-type="${item.type_partit || ''}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete btn-del"
                            data-endpoint="semestre"
                            data-id="${item.id_semestre}"
                            data-name="${item.nom_semestre}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Peupler les selects semestre dans modals semaine + filtre
            const selects = [
                document.getElementById('addSemaineSemestre'),
                document.getElementById('editSemaineSemestre'),
                document.getElementById('filterSemestre')
            ];
            selects.forEach(sel => {
                if (!sel) return;
                const isFilter = sel.id === 'filterSemestre';
                fillSelect(sel, data, 'id_semestre', 'nom_semestre',
                    isFilter ? 'Tous les semestres' : '-- Choisir un semestre --');
            });
        }

        async function loadSemaines(filterIdSemestre = '') {
            const res  = await fetch('/config/semaine');
            const data = await res.json();
            seminesAllData = data;
            renderSemaines(filterIdSemestre);
        }

        function renderSemaines(filterIdSemestre = '') {
            const row  = document.getElementById('rowSemaines');
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
                const debutIso = item.date_debut ? item.date_debut.substring(0, 10) : '';
                const finIso   = item.date_fin   ? item.date_fin.substring(0, 10)   : '';
                const debut = formatIsoToDayMonth(debutIso);
                const fin   = formatIsoToDayMonth(finIso);

                // Badge couleur semestre
                const semLabel = item.nom_semestre
                    ? `<span class="badge bg-primary ms-1">${item.nom_semestre}</span>`
                    : '';

                col.innerHTML = `
                    <div class="week-card">
                        <div class="week-number">${index + 1}</div>
                        <h6>${item.nom_semaine} ${semLabel}</h6>
                        <p><i class="fas fa-calendar"></i> ${debut} → ${fin}</p>
                        <div class="card-actions mt-2">
                            <button class="btn btn-sm btn-edit btn-edit-semaine"
                                data-id="${item.id_semaine}"
                                data-nom="${item.nom_semaine}"
                                data-debut="${debutIso}"
                                data-fin="${finIso}"
                                data-semestre="${item.id_semestre || ''}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-delete btn-del"
                                data-endpoint="semaine"
                                data-id="${item.id_semaine}"
                                data-name="${item.nom_semaine}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
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
            data.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="badge bg-info">Créneau ${index + 1}</span></td>
                    <td>${item.heure_debut || '-'}</td>
                    <td>${item.heure_fin   || '-'}</td>
                    <td>${item.duree       || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-edit btn-edit-creneau"
                            data-id="${item.id_creneau}"
                            data-debut="${item.heure_debut || ''}"
                            data-fin="${item.heure_fin || ''}"
                            data-duree="${item.duree || ''}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete btn-del"
                            data-endpoint="creneau"
                            data-id="${item.id_creneau}"
                            data-name="Créneau ${index + 1}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Charger tout au démarrage
        window.addEventListener('load', async () => {
            await loadSemestres(); // en premier pour peupler les selects
            loadAnnees();
            loadSemaines();
            loadCreneaux();
        });

        // ── Filtre semaines par semestre ───────────────────────────
        document.getElementById('filterSemestre').addEventListener('change', function () {
            renderSemaines(this.value);
        });

        // ══════════════════════════════════════════════════════════
        // AJOUT
        // ══════════════════════════════════════════════════════════

        async function saveItem(btnId, formId, modalId, endpoint, reloadFn) {
            document.getElementById(btnId).addEventListener('click', async () => {
                const form = document.getElementById(formId);
                if (!form.checkValidity()) return alert("Veuillez remplir tous les champs obligatoires");
                const data = Object.fromEntries(new FormData(form));

                if (endpoint === 'semaine') {
                    const startIso = parseDayMonthToIso(data.date_debut);
                    const endIso = parseDayMonthToIso(data.date_fin);
                    if (!startIso || !endIso) {
                        alert('Format de date invalide. Utilisez JJ/MM (ex: 15/09).');
                        return;
                    }
                    if (new Date(`${startIso}T00:00:00`) > new Date(`${endIso}T00:00:00`)) {
                        alert('La date début doit être antérieure ou égale à la date fin.');
                        return;
                    }
                    data.date_debut = startIso;
                    data.date_fin = endIso;
                }

                const res  = await fetch(`/config/${endpoint}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
                    form.reset();
                    reloadFn();
                } else {
                    const err = await res.json();
                    alert("Erreur: " + (err.error || "Inconnue"));
                }
            });
        }

        saveItem('btnSaveAnnee',    'formAddAnnee',    'addAnneeModal',    'annee',    loadAnnees);
        saveItem('btnSaveSemestre', 'formAddSemestre', 'addSemestreModal', 'semestre', async () => { await loadSemestres(); });
        saveItem('btnSaveSemaine',  'formAddSemaine',  'addSemaineModal',  'semaine',  loadSemaines);
        saveItem('btnSaveCreneau',  'formAddCreneau',  'addCreneauModal',  'creneau',  loadCreneaux);

        // ══════════════════════════════════════════════════════════
        // SUPPRESSION — délégation d'événements
        // ══════════════════════════════════════════════════════════

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-del');
            if (btn) {
                deleteEndpoint = btn.dataset.endpoint;
                deleteId       = btn.dataset.id;
                document.getElementById('deleteItemName').textContent = btn.dataset.name;
                deleteReload = {
                    annee:    loadAnnees,
                    semestre: loadSemestres,
                    semaine:  loadSemaines,
                    creneau:  loadCreneaux
                }[deleteEndpoint];
                new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
            }
        });

        document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
            if (!deleteEndpoint || !deleteId) return;
            const res = await fetch(`/config/${deleteEndpoint}/${deleteId}`, { method: 'DELETE' });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
                if (deleteReload) deleteReload();
            } else {
                alert("Erreur lors de la suppression");
            }
        });

        // ══════════════════════════════════════════════════════════
        // ÉDITION — délégation d'événements
        // ══════════════════════════════════════════════════════════

        document.addEventListener('click', function(e) {

            // Édition Année
            const btnA = e.target.closest('.btn-edit-annee');
            if (btnA) {
                document.getElementById('editAnneeId').value      = btnA.dataset.id;
                document.getElementById('editAnneeLibelle').value = btnA.dataset.libelle;
                new bootstrap.Modal(document.getElementById('editAnneeModal')).show();
            }

            // Édition Semestre
            const btnS = e.target.closest('.btn-edit-semestre');
            if (btnS) {
                document.getElementById('editSemestreId').value  = btnS.dataset.id;
                document.getElementById('editNomSemestre').value = btnS.dataset.nom;
                document.getElementById('editTypeSemestre').value = btnS.dataset.type || '';
                new bootstrap.Modal(document.getElementById('editSemestreModal')).show();
            }

            // Édition Semaine — pré-sélectionner le semestre
            const btnW = e.target.closest('.btn-edit-semaine');
            if (btnW) {
                document.getElementById('editSemaineId').value        = btnW.dataset.id;
                document.getElementById('editNomSemaine').value       = btnW.dataset.nom;
                document.getElementById('editDateDebutSemaine').value = formatIsoToDayMonth(btnW.dataset.debut);
                document.getElementById('editDateFinSemaine').value   = formatIsoToDayMonth(btnW.dataset.fin);
                // Sélectionner le semestre actuel
                document.getElementById('editSemaineSemestre').value  = btnW.dataset.semestre || '';
                new bootstrap.Modal(document.getElementById('editSemaineModal')).show();
            }

            // Édition Créneau
            const btnC = e.target.closest('.btn-edit-creneau');
            if (btnC) {
                document.getElementById('editCreneauId').value  = btnC.dataset.id;
                document.getElementById('editHeureDebut').value = btnC.dataset.debut;
                document.getElementById('editHeureFin').value   = btnC.dataset.fin;
                document.getElementById('editDuree').value      = btnC.dataset.duree;
                new bootstrap.Modal(document.getElementById('editCreneauModal')).show();
            }
        });

        // ══════════════════════════════════════════════════════════
        // SAUVEGARDE ÉDITION
        // ══════════════════════════════════════════════════════════

        async function updateItem(btnId, formId, idFieldId, modalId, endpoint, reloadFn) {
            document.getElementById(btnId).addEventListener('click', async () => {
                const id   = document.getElementById(idFieldId).value;
                const data = Object.fromEntries(new FormData(document.getElementById(formId)));

                if (endpoint === 'semaine') {
                    const startIso = parseDayMonthToIso(data.date_debut);
                    const endIso = parseDayMonthToIso(data.date_fin);
                    if (!startIso || !endIso) {
                        alert('Format de date invalide. Utilisez JJ/MM (ex: 15/09).');
                        return;
                    }
                    if (new Date(`${startIso}T00:00:00`) > new Date(`${endIso}T00:00:00`)) {
                        alert('La date début doit être antérieure ou égale à la date fin.');
                        return;
                    }
                    data.date_debut = startIso;
                    data.date_fin = endIso;
                }

                const res  = await fetch(`/config/${endpoint}/${id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
                    reloadFn();
                } else {
                    alert("Erreur lors de la modification");
                }
            });
        }

        updateItem('btnSaveEditAnnee',    'formEditAnnee',    'editAnneeId',    'editAnneeModal',    'annee',    loadAnnees);
        updateItem('btnSaveEditSemestre', 'formEditSemestre', 'editSemestreId', 'editSemestreModal', 'semestre', loadSemestres);
        updateItem('btnSaveEditSemaine',  'formEditSemaine',  'editSemaineId',  'editSemaineModal',  'semaine',  loadSemaines);
        updateItem('btnSaveEditCreneau',  'formEditCreneau',  'editCreneauId',  'editCreneauModal',  'creneau',  loadCreneaux);