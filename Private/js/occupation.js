 AOS.init({ duration: 600, once: true });

    // ─────────────── UTILITAIRES ───────────────
    function fillSelect(sel, data, valKey, labelKey) {
        const first = sel.options[0] || document.createElement('option');
        first.value = '';
        first.textContent = 'Choisir';
        sel.innerHTML = '';
        sel.appendChild(first);

        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valKey];
            opt.textContent = item[labelKey];
            sel.appendChild(opt);
        });
    }

    function fillAll(className, data, valKey, labelKey) {
        document.querySelectorAll('.' + className).forEach(sel => {
            fillSelect(sel, data, valKey, labelKey);
        });
    }

    // ─────────────── DONNÉES EN MÉMOIRE ───────────────
    let filieresData = [];

    // ─────────────── CHARGEMENT DONNÉES RÉFÉRENCE ───────────────
    async function loadRefData() {
        try {
            const [
                annees,
                semestres,
                filieres,
                creneaux,
                salles,
                modules,
                professeurs,
                semaines
            ] = await Promise.all([
                fetch('/occupation/data/annees').then(r => r.json()),
                fetch('/occupation/data/semestres').then(r => r.json()),
                fetch('/occupation/data/filieres').then(r => r.json()),
                fetch('/occupation/data/creneaux').then(r => r.json()),
                fetch('/occupation/data/salles').then(r => r.json()),
                fetch('/occupation/data/modules').then(r => r.json()),
                fetch('/occupation/data/professeurs').then(r => r.json()),
                fetch('/occupation/data/semaines').then(r => r.json()),
            ]);

            filieresData = filieres;

            // Filtres globaux
            fillSelect(document.getElementById('globalAnnee'),    annees,     'id_annee',    'libelle');
            fillSelect(document.getElementById('globalSemestre'), semestres,  'id_semestre', 'nom_semestre');
            fillSelect(document.getElementById('globalFiliere'),  filieres,   'id_filier',   'nom_filiere');

            // Créneaux formatés
            const creneauxFmt = creneaux.map(c => ({
                id_creneau: c.id_creneau,
                label: `${c.heure_debut} - ${c.heure_fin}`
            }));
            fillAll('sel-creneau', creneauxFmt, 'id_creneau', 'label');

            // Autres listes
            fillAll('sel-salle',     salles,     'id_salle',   'nom_salle');
            fillAll('sel-module',    modules,    'id_modul',   'nom_module');   // ← important : id_modul depuis le back
            fillAll('sel-prof',      professeurs,'id_prof',    'nom_complet');
            fillAll('sel-sd',        semaines,   'id_semaine', 'nom_semaine');
            fillAll('sel-sf',        semaines,   'id_semaine', 'nom_semaine');

            setGroupes(0);
            initSlotListeners();
        } catch (err) {
            console.error("Erreur chargement données référence :", err);
            alert("Impossible de charger les données de référence.");
        }
    }

    // ─────────────── MISE À JOUR NOMBRE GROUPES ───────────────
    function setGroupes(nb) {
        document.querySelectorAll('.sel-groupe').forEach(sel => {
            sel.innerHTML = '<option value="">Choisir</option>';
            for (let i = 1; i <= nb; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `Groupe ${i}`;
                sel.appendChild(opt);
            }
        });
    }

    // ─────────────── FILIÈRE → GROUPES + MODULES ───────────────
    document.getElementById('globalFiliere').addEventListener('change', async function () {
        const id_filier = this.value;

        if (!id_filier) {
            setGroupes(0);
            const allModules = await fetch('/occupation/data/modules').then(r => r.json());
            fillAll('sel-module', allModules, 'id_modul', 'nom_module');
            return;
        }

        const filiere = filieresData.find(f => String(f.id_filier) === String(id_filier));
        const nb = filiere?.nb_group ? parseInt(filiere.nb_group) : 0;
        setGroupes(nb);

        const modulesFiliere = await fetch(`/occupation/data/modules?id_filier=${id_filier}`).then(r => r.json());
        fillAll('sel-module', modulesFiliere, 'id_modul', 'nom_module');
    });

    // ─────────────── CHARGER SALLES LIBRES ───────────────
    async function loadSallesLibres(slot) {
        const id_annee    = document.getElementById('globalAnnee').value;
        const id_semestre = document.getElementById('globalSemestre').value;
        const id_creneau  = slot.querySelector('.sel-creneau').value;
        const sd          = slot.querySelector('.sel-sd').value;
        const sf          = slot.querySelector('.sel-sf').value;
        const jour        = slot.dataset.jour;

        const selSalle = slot.querySelector('.sel-salle');

        if (!id_annee || !id_semestre || !id_creneau || !sd || !sf || !jour) {
            selSalle.innerHTML = '<option value="">Choisir d\'abord les filtres</option>';
            return;
        }

        try {
            const url = `/occupation/data/salles_libres?` +
                        `annee=${encodeURIComponent(id_annee)}` +
                        `&semestre=${encodeURIComponent(id_semestre)}` +
                        `&jour=${encodeURIComponent(jour)}` +
                        `&creneau=${encodeURIComponent(id_creneau)}` +
                        `&sd=${encodeURIComponent(sd)}` +
                        `&sf=${encodeURIComponent(sf)}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur serveur : ${response.status}`);
            }

            const sallesLibres = await response.json();

            fillSelect(selSalle, sallesLibres, 'id_salle', 'nom_salle');

            // Optionnel : montrer combien de salles sont disponibles
            if (sallesLibres.length === 0) {
                selSalle.innerHTML = '<option value="">Aucune salle libre</option>';
            }
        } catch (err) {
            console.error("Erreur loadSallesLibres :", err);
            selSalle.innerHTML = '<option value="">Erreur chargement</option>';
        }
    }

    // ─────────────── ÉCOUTEURS POUR CHARGER LES SALLES LIBRES ───────────────
    function initSlotListeners() {
        document.querySelectorAll('.time-slot').forEach(slot => {
            // Changement sur créneau, sd, sf → recharger salles
            ['.sel-creneau', '.sel-sd', '.sel-sf'].forEach(cls => {
                const select = slot.querySelector(cls);
                if (select) {
                    select.addEventListener('change', () => loadSallesLibres(slot));
                }
            });
        });

        // Changement année / semestre global → recharger partout
        ['globalAnnee', 'globalSemestre'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                document.querySelectorAll('.time-slot').forEach(slot => loadSallesLibres(slot));
            });
        });
    }

    // ─────────────── ENREGISTREMENT ───────────────
    document.getElementById('btnEnregistrer').addEventListener('click', async () => {
        const id_annee    = document.getElementById('globalAnnee').value;
        const id_semestre = document.getElementById('globalSemestre').value;
        const id_filier   = document.getElementById('globalFiliere').value;

        if (!id_annee || !id_semestre || !id_filier) {
            alert("Veuillez choisir Année, Semestre et Filière");
            return;
        }

        const occupations = [];

        document.querySelectorAll('.time-slot').forEach(slot => {
            const jour       = slot.dataset.jour;
            const id_creneau = slot.querySelector('.sel-creneau').value;
            const id_salles  = slot.querySelector('.sel-salle').value;
            const id_modul   = slot.querySelector('.sel-module').value;
            const group      = slot.querySelector('.sel-groupe').value;
            const id_prof    = slot.querySelector('.sel-prof').value;
            const sD         = slot.querySelector('.sel-sd').value;
            const sF         = slot.querySelector('.sel-sf').value;

            if (id_creneau && id_salles && id_modul && group && id_prof && sD && sF) {
                occupations.push({
                    id_annee,
                    id_semestre,
                    id_creneau,
                    jour,
                    id_salles,
                    id_filier,
                    group,
                    id_modul,
                    id_prof,
                    sD,
                    sF
                });
            }
        });

        if (occupations.length === 0) {
            alert("Aucun créneau complet à enregistrer.");
            return;
        }

        let succes = 0;
        let echecs = 0;

        for (const occ of occupations) {
            try {
                const res = await fetch('/occupation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(occ)
                });

                if (res.ok) {
                    succes++;
                } else {
                    echecs++;
                    console.warn("Échec enregistrement :", await res.text());
                }
            } catch (err) {
                echecs++;
                console.error(err);
            }
        }

        alert(`${succes} créneau(x) enregistré(s) – ${echecs} échec(s)`);

        if (echecs === 0) {
            // Reset formulaire si tout est OK
            document.querySelectorAll('.time-slot select').forEach(s => s.selectedIndex = 0);
        }
    });

    // ─────────────── LANCEMENT ───────────────
    window.addEventListener('load', () => {
        loadRefData();
        // initSlotListeners() est appelé à la fin de loadRefData()
    });