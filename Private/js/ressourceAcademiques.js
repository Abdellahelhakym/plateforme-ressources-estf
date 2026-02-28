AOS.init({ duration: 600, once: true });

        let deleteType = null;
        let deleteId = null;

        // ────────────────────────────────────────────────
        // CHARGEMENT DES DONNÉES
        // ────────────────────────────────────────────────
        async function loadFilieres() {
            const res = await fetch('/ressource/filiere');
            const data = await res.json();
            const tbody = document.querySelector('#tableFilieres tbody');
            tbody.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom_filiere}</td>
                    <td>${item.annee}</td>
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

            // Mettre à jour les selects de filières dans les modals module et professeur
            populateFiliereSelects(data);
        }

        async function loadProfesseurs() {
            const res = await fetch('/ressource/professeur');
            const data = await res.json();
            const tbody = document.querySelector('#tableProfesseurs tbody');
            tbody.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom}</td>
                    <td>${item.prenom}</td>
                    <td>${item.email}</td>
                    <td>${item.departement}</td>
                    <td>${item.filier || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-edit edit-Professeurs"
                            data-id="${item.id}"
                            data-nom="${item.nom}"
                            data-prenom="${item.prenom}"
                            data-email="${item.email}"
                            data-dept="${item.departement}"
                            data-filiere="${item.id_filiere || ''}">
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
            const data = await res.json();
            const tbody = document.querySelector('#tableModules tbody');
            tbody.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nom_module}</td>
                    <td>${item.filiere || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-edit edit-Modules"
                            data-id="${item.id_module}"
                            data-nom="${item.nom_module}"
                            data-filiere="${item.id_filiere}">
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

        // Peupler les selects filière dans les modals module ET professeur (nom + année)
        function populateFiliereSelects(filieres) {
            const selects = ['selectFiliereModule', 'editFiliereModule', 'selectFiliereProf', 'editFiliereProf'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (!select) return;
                const currentVal = select.value;
                select.innerHTML = '<option value="">-- Aucune --</option>';
                filieres.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    opt.textContent = `${f.nom_filiere} - ${f.annee}`;
                    select.appendChild(opt);
                });
                if (currentVal) select.value = currentVal;
            });
        }

        // Charger tout au démarrage
        window.addEventListener('load', () => {
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

            const data = Object.fromEntries(new FormData(form));
            const res = await fetch('/ressource/professeur', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addProfModal')).hide();
                form.reset();
                loadProfesseurs();
            } else {
                alert("Erreur lors de l'ajout");
            }
        });

        // ────────────────────────────────────────────────
        // AJOUT - MODULE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveModule').addEventListener('click', async () => {
            const form = document.getElementById('formAddModule');
            if (!form.checkValidity()) return alert("Veuillez remplir tous les champs");

            const data = Object.fromEntries(new FormData(form));
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
                new bootstrap.Modal(document.getElementById('editFiliereModal')).show();
            }

            // Édition Professeur
            const btnProf = e.target.closest('.edit-Professeurs');
            if (btnProf) {
                document.getElementById('editProfId').value        = btnProf.dataset.id;
                document.getElementById('editNomProf').value       = btnProf.dataset.nom;
                document.getElementById('editPrenomProf').value    = btnProf.dataset.prenom;
                document.getElementById('editEmailProf').value     = btnProf.dataset.email;
                document.getElementById('editDeptProf').value      = btnProf.dataset.dept;
                document.getElementById('editFiliereProf').value   = btnProf.dataset.filiere;
                new bootstrap.Modal(document.getElementById('editProfModal')).show();
            }

            // Édition Module
            const btnModule = e.target.closest('.edit-Modules');
            if (btnModule) {
                document.getElementById('editModuleId').value      = btnModule.dataset.id;
                document.getElementById('editNomModule').value     = btnModule.dataset.nom;
                document.getElementById('editFiliereModule').value = btnModule.dataset.filiere;
                new bootstrap.Modal(document.getElementById('editModuleModal')).show();
            }
        });

        // ────────────────────────────────────────────────
        // SAUVEGARDE ÉDITION - FILIÈRE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveEditFiliere').addEventListener('click', async () => {
            const id   = document.getElementById('editFiliereId').value;
            const data = Object.fromEntries(new FormData(document.getElementById('formEditFiliere')));

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

            const res = await fetch(`/ressource/professeur/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editProfModal')).hide();
                loadProfesseurs();
            } else {
                alert("Erreur modification");
            }
        });

        // ────────────────────────────────────────────────
        // SAUVEGARDE ÉDITION - MODULE
        // ────────────────────────────────────────────────
        document.getElementById('btnSaveEditModule').addEventListener('click', async () => {
            const id   = document.getElementById('editModuleId').value;
            const data = Object.fromEntries(new FormData(document.getElementById('formEditModule')));

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