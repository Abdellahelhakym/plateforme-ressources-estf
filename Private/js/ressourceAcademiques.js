AOS.init({ duration: 600, once: true });

        let deleteType = null;
        let deleteId = null;
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

        function showAddProfError(message) {
            const errorEl = document.getElementById('addProfError');
            if (!errorEl) return;
            if (!message) {
                errorEl.textContent = '';
                errorEl.classList.add('d-none');
                return;
            }
            errorEl.textContent = message;
            errorEl.classList.remove('d-none');
        }

        function getMultiSelectValues(selectId) {
            const el = document.getElementById(selectId);
            if (!el) return [];
            return Array.from(el.selectedOptions)
                .map(o => parseInt(o.value, 10))
                .filter(v => Number.isInteger(v) && v > 0);
        }

        function setMultiSelectValues(selectId, values) {
            const el = document.getElementById(selectId);
            if (!el) return;
            const wanted = new Set((values || []).map(v => String(v)));
            Array.from(el.options).forEach(opt => {
                opt.selected = wanted.has(String(opt.value));
            });
        }

        function syncAnneeByNiveau(niveauSelectId, anneeSelectId) {
            const niveauEl = document.getElementById(niveauSelectId);
            const anneeEl = document.getElementById(anneeSelectId);
            if (!niveauEl || !anneeEl) return;

            const isBachelor = String(niveauEl.value || '').toLowerCase() === 'bachelor';
            if (isBachelor) {
                anneeEl.value = '';
                anneeEl.disabled = true;
                anneeEl.required = false;
            } else {
                anneeEl.disabled = false;
                anneeEl.required = true;
            }
        }

        // ────────────────────────────────────────────────
        // CHARGEMENT DES DONNÉES
        // ────────────────────────────────────────────────
        async function loadFilieres() {
            const res = await fetch('/ressource/filiere');
            filieresData = await res.json();
            renderFilieres();
            populateFiliereSelects(filieresData);
            populateFilterFiliereOptions();
        }

        function renderFilieres() {
            const tbody = document.querySelector('#tableFilieres tbody');
            tbody.innerHTML = '';

            const anneeFilter = document.getElementById('filterFiliereAnnee')?.value || '';
            const filtered = filieresData.filter((item) => {
                if (!anneeFilter) return true;
                if (anneeFilter === '__empty__') return !String(item.annee || '').trim();
                return String(item.annee || '') === anneeFilter;
            });

            filtered.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom_filiere}</td>
                    <td>${getFiliereSuffix(item)}</td>
                    <td>${item.niveau}</td>
                    <td>${item.nb_group}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-edit edit-filier"
                            data-id="${item.id}"
                            data-nom="${item.nom_filiere}"
                            data-annee="${item.annee}"
                            data-niveau="${item.niveau}"
                            data-groupes="${item.nb_group}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete"
                            data-type="filiere"
                            data-id="${item.id}"
                            data-name="${item.nom_filiere}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function loadProfesseurs() {
            const res = await fetch('/ressource/professeur');
            professeursData = await res.json();
            renderProfesseurs();
        }

        function renderProfesseurs() {
            const tbody = document.querySelector('#tableProfesseurs tbody');
            tbody.innerHTML = '';

            const filiereFilter = parseInt(document.getElementById('filterProfFiliere')?.value || '', 10);
            const filtered = professeursData.filter((item) => {
                if (!Number.isInteger(filiereFilter)) return true;
                const ids = parseIdList(item.id_filieres || item.id_filiere || '');
                return ids.includes(filiereFilter);
            });

            filtered.forEach(item => {
                const filieresLabel = item.filieres || item.filier || '-';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom}</td>
                    <td>${item.prenom}</td>
                    <td>${item.email}</td>
                    <td>${item.departement}</td>
                    <td>${filieresLabel}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-edit edit-Professeurs"
                            data-id="${item.id}"
                            data-nom="${item.nom}"
                            data-prenom="${item.prenom}"
                            data-email="${item.email}"
                            data-dept="${item.departement}"
                            data-filieres="${item.id_filieres || (item.id_filiere || '')}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete"
                            data-type="professeur"
                            data-id="${item.id}"
                            data-name="${item.nom} ${item.prenom}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function loadModules() {
            const res = await fetch('/ressource/module');
            modulesData = await res.json();
            renderModules();
        }

        function renderModules() {
            const tbody = document.querySelector('#tableModules tbody');
            tbody.innerHTML = '';

            const filiereFilter = parseInt(document.getElementById('filterModuleFiliere')?.value || '', 10);
            const filtered = modulesData.filter((item) => {
                if (!Number.isInteger(filiereFilter)) return true;
                const ids = parseIdList(item.id_filieres || item.id_filiere || '');
                return ids.includes(filiereFilter);
            });

            filtered.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom_module}</td>
                    <td>${item.filieres || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-edit edit-Modules"
                            data-id="${item.id_module}"
                            data-nom="${item.nom_module}"
                            data-filieres="${item.id_filieres || (item.id_filiere || '')}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete"
                            data-type="module"
                            data-id="${item.id_module}"
                            data-name="${item.nom_module}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
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

        // Peupler les selects filière dans les modals module ET professeur (nom + année)
        function populateFiliereSelects(filieres) {
            const selects = ['selectFiliereModule', 'editFiliereModule', 'selectFiliereProf', 'editFiliereProf'];
            const moduleSelects = new Set(['selectFiliereModule', 'editFiliereModule']);
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (!select) return;

                const currentVals = select.multiple
                    ? Array.from(select.selectedOptions).map(o => o.value)
                    : [select.value];

                select.innerHTML = moduleSelects.has(selectId)
                    ? ''
                    : '<option value="">-- Aucune --</option>';

                filieres.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    opt.textContent = getFiliereLabel(f);
                    select.appendChild(opt);
                });

                if (select.multiple) {
                    setMultiSelectValues(selectId, currentVals);
                } else if (currentVals[0]) {
                    select.value = currentVals[0];
                }
            });
        }

        // Charger tout au démarrage
        window.addEventListener('load', () => {
            const addNiveau = document.querySelector('#formAddFiliere [name="niveau"]');
            const editNiveau = document.getElementById('editNiveauFiliere');

            if (addNiveau) {
                addNiveau.addEventListener('change', () => syncAnneeByNiveau(addNiveau.id || '', addNiveau.form?.querySelector('[name="annee"]')?.id || ''));
                const addAnneeEl = addNiveau.form?.querySelector('[name="annee"]');
                if (addNiveau.id === '') addNiveau.id = 'addNiveauFiliere';
                if (addAnneeEl && addAnneeEl.id === '') addAnneeEl.id = 'addAnneeFiliere';
                syncAnneeByNiveau('addNiveauFiliere', 'addAnneeFiliere');
            }

            if (editNiveau) {
                editNiveau.addEventListener('change', () => syncAnneeByNiveau('editNiveauFiliere', 'editAnneeFiliere'));
                syncAnneeByNiveau('editNiveauFiliere', 'editAnneeFiliere');
            }

            document.getElementById('filterFiliereAnnee')?.addEventListener('change', renderFilieres);
            document.getElementById('filterProfFiliere')?.addEventListener('change', renderProfesseurs);
            document.getElementById('filterModuleFiliere')?.addEventListener('change', renderModules);

            loadFilieres();
            loadProfesseurs();
            loadModules();
        });

        // ────────────────────────────────────────────────
        // AJOUT - FILIÈRE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveFiliere').addEventListener('click', async () => {
            const form = document.getElementById('formAddFiliere');
            if (!form.checkValidity()) return alert("Veuillez remplir tous les champs");

            const data = Object.fromEntries(new FormData(form));
            if (String(data.niveau || '').toLowerCase() === 'bachelor') {
                data.annee = '';
            }
            const res = await fetch('/ressource/filiere', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addFiliereModal')).hide();
                form.reset();
                loadFilieres();
            } else {
                alert("Erreur lors de l'ajout");
            }
        });

        // ────────────────────────────────────────────────
        // AJOUT - PROFESSEUR
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveProf').addEventListener('click', async () => {
            const form = document.getElementById('formAddProf');
            if (!form.checkValidity()) return alert("Veuillez remplir tous les champs");
            showAddProfError('');

            const data = Object.fromEntries(new FormData(form));
            data.id_filieres = getMultiSelectValues('selectFiliereProf');
            const res = await fetch('/ressource/professeur', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addProfModal')).hide();
                form.reset();
                showAddProfError('');
                loadProfesseurs();
            } else {
                const error = await res.json().catch(() => ({ error: "Erreur lors de l'ajout" }));
                const errorMessage = error.error || "Erreur lors de l'ajout";
                if (/gmail/i.test(errorMessage)) {
                    showAddProfError(errorMessage);
                } else {
                    showAddProfError('');
                    alert(errorMessage);
                }
            }
        });

        document.getElementById('formAddProf')?.querySelector('[name="email"]')?.addEventListener('input', () => {
            showAddProfError('');
        });

        // ────────────────────────────────────────────────
        // AJOUT - MODULE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveModule').addEventListener('click', async () => {
            const form = document.getElementById('formAddModule');
            if (!form.checkValidity()) return alert("Veuillez remplir tous les champs");

            const data = Object.fromEntries(new FormData(form));
            data.id_filieres = getMultiSelectValues('selectFiliereModule');
            if (!data.id_filieres.length) {
                alert('Veuillez sélectionner au moins une filière');
                return;
            }
            const res = await fetch('/ressource/module', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addModuleModal')).hide();
                form.reset();
                loadModules();
            } else {
                alert("Erreur lors de l'ajout");
            }
        });

        // ────────────────────────────────────────────────
        // SUPPRESSION - via délégation d'événements
        // ────────────────────────────────────────────────
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-delete');
            if (btn) {
                deleteType = btn.dataset.type;
                deleteId   = btn.dataset.id;
                document.getElementById('itemName').textContent = btn.dataset.name;
                new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
            }
        });

        document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
            if (!deleteType || !deleteId) return;
            const url = `/ressource/${deleteType}/${deleteId}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
                if (deleteType === 'filiere') loadFilieres();
                if (deleteType === 'professeur') loadProfesseurs();
                if (deleteType === 'module') loadModules();
            } else {
                alert("Erreur suppression");
            }
        });

        // ────────────────────────────────────────────────
        // ÉDITION - via délégation d'événements
        // ────────────────────────────────────────────────
        document.addEventListener('click', function(e) {

            // Édition Filière
            const btnFiliere = e.target.closest('.edit-filier');
            if (btnFiliere) {
                document.getElementById('editFiliereId').value     = btnFiliere.dataset.id;
                document.getElementById('editNomFiliere').value    = btnFiliere.dataset.nom;
                document.getElementById('editAnneeFiliere').value  = btnFiliere.dataset.annee;
                document.getElementById('editNiveauFiliere').value = btnFiliere.dataset.niveau;
                document.getElementById('editNbGroup').value       = btnFiliere.dataset.groupes;
                syncAnneeByNiveau('editNiveauFiliere', 'editAnneeFiliere');
                new bootstrap.Modal(document.getElementById('editFiliereModal')).show();
            }

            // Édition Professeur
            const btnProf = e.target.closest('.edit-Professeurs');
            if (btnProf) {
                document.getElementById('editProfId').value        = btnProf.dataset.id;
                document.getElementById('editNomProf').value       = btnProf.dataset.nom;
                document.getElementById('editPrenomProf').value    = btnProf.dataset.prenom;
                document.getElementById('editEmailProf').value     = btnProf.dataset.email;
                document.getElementById('editPasswordProf').value  = '';
                document.getElementById('editDeptProf').value      = btnProf.dataset.dept;
                const ids = String(btnProf.dataset.filieres || '')
                    .split(',')
                    .map(v => parseInt(v.trim(), 10))
                    .filter(v => Number.isInteger(v) && v > 0);
                setMultiSelectValues('editFiliereProf', ids);
                new bootstrap.Modal(document.getElementById('editProfModal')).show();
            }

            // Édition Module
            const btnModule = e.target.closest('.edit-Modules');
            if (btnModule) {
                document.getElementById('editModuleId').value      = btnModule.dataset.id;
                document.getElementById('editNomModule').value     = btnModule.dataset.nom;
                const ids = String(btnModule.dataset.filieres || '')
                    .split(',')
                    .map(v => parseInt(v.trim(), 10))
                    .filter(v => Number.isInteger(v) && v > 0);
                setMultiSelectValues('editFiliereModule', ids);
                new bootstrap.Modal(document.getElementById('editModuleModal')).show();
            }
        });

        // ────────────────────────────────────────────────
        // SAUVEGARDE ÉDITION - FILIÈRE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveEditFiliere').addEventListener('click', async () => {
            const id   = document.getElementById('editFiliereId').value;
            const data = Object.fromEntries(new FormData(document.getElementById('formEditFiliere')));
            if (String(data.niveau || '').toLowerCase() === 'bachelor') {
                data.annee = '';
            }

            const res = await fetch(`/ressource/filiere/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editFiliereModal')).hide();
                loadFilieres();
            } else {
                alert("Erreur modification");
            }
        });

        // ────────────────────────────────────────────────
        // SAUVEGARDE ÉDITION - PROFESSEUR
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveEditProf').addEventListener('click', async () => {
            const id   = document.getElementById('editProfId').value;
            const data = Object.fromEntries(new FormData(document.getElementById('formEditProf')));
            data.id_filieres = getMultiSelectValues('editFiliereProf');

            const res = await fetch(`/ressource/professeur/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editProfModal')).hide();
                loadProfesseurs();
            } else {
                const error = await res.json().catch(() => ({ error: "Erreur modification" }));
                alert(error.error || "Erreur modification");
            }
        });

        // ────────────────────────────────────────────────
        // SAUVEGARDE ÉDITION - MODULE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveEditModule').addEventListener('click', async () => {
            const id   = document.getElementById('editModuleId').value;
            const data = Object.fromEntries(new FormData(document.getElementById('formEditModule')));
            data.id_filieres = getMultiSelectValues('editFiliereModule');
            if (!data.id_filieres.length) {
                alert('Veuillez sélectionner au moins une filière');
                return;
            }

            const res = await fetch(`/ressource/module/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editModuleModal')).hide();
                loadModules();
            } else {
                alert("Erreur modification");
            }
        });