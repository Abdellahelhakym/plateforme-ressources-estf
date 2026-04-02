const express = require('express');
const occupation = express.Router();
const connection = require('./db');

occupation.use(express.json());

// =============================================================================
// DONNÉES DE RÉFÉRENCE
// =============================================================================

occupation.get('/data/annees', (req, res) => {
    connection.query('SELECT id_annee, libelle FROM annee ORDER BY libelle DESC', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

occupation.get('/data/semestres', (req, res) => {
    connection.query('SELECT id_semestre, nom_semestre FROM semestre ORDER BY nom_semestre', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

occupation.get('/data/creneaux', (req, res) => {
    connection.query('SELECT id_creneau, heure_debut, heure_fin, duree FROM creneau ORDER BY heure_debut', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

occupation.get('/data/salles', (req, res) => {
    connection.query('SELECT id_salle, nom_salle FROM salles ORDER BY nom_salle', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

// =============================================================================
// SALLES LIBRES
// =============================================================================
occupation.get('/data/salles_libres', (req, res) => {
    const { annee, semestre, jour, creneau, sd, sf } = req.query;

    if (!annee || !semestre || !jour || !creneau || !sd || !sf) {
        return res.status(400).json({ error: "Paramètres manquants : annee, semestre, jour, creneau, sd, sf" });
    }

    const sdInt = parseInt(sd, 10);
    const sfInt = parseInt(sf, 10);

    if (isNaN(sdInt) || isNaN(sfInt)) {
        return res.status(400).json({ error: "sd et sf doivent être des entiers valides" });
    }

    function normalizePartit(value) {
        const v = String(value || '').trim().toLowerCase();
        if (v === 'partie 1' || v === 'partit 1') return 'partit 1';
        if (v === 'partie 2' || v === 'partit 2') return 'partit 2';
        return null;
    }

    function derivePartitFromNomSemestre(nomSemestre) {
        const m = String(nomSemestre || '').trim().match(/^S(\d+)$/i);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        if (Number.isNaN(n)) return null;
        return (n % 2 === 0) ? 'partit 2' : 'partit 1';
    }

    connection.query(
        'SELECT nom_semestre, type_partit FROM semestre WHERE id_semestre = ?',
        [semestre],
        (errPartit, semRows) => {
            if (errPartit) {
                console.error('[salles_libres] Erreur lecture semestre:', errPartit.message);
                return res.status(500).json({ error: errPartit.message });
            }

            if (!semRows || semRows.length === 0) {
                return res.status(400).json({ error: 'Semestre introuvable' });
            }

            const selectedSem = semRows[0];
            const selectedPartit =
                normalizePartit(selectedSem.type_partit) ||
                derivePartitFromNomSemestre(selectedSem.nom_semestre) ||
                `sem:${semestre}`;

            connection.query(
                'SELECT id_semaine, date_debut, date_fin FROM semaine WHERE id_semaine IN (?, ?)',
                [sdInt, sfInt],
                (errWeeks, weekRows) => {
                    if (errWeeks) {
                        console.error('[salles_libres] Erreur lecture semaines:', errWeeks.message);
                        return res.status(500).json({ error: errWeeks.message });
                    }

                    const sdWeek = (weekRows || []).find(w => Number(w.id_semaine) === sdInt);
                    const sfWeek = (weekRows || []).find(w => Number(w.id_semaine) === sfInt);
                    if (!sdWeek || !sfWeek) {
                        return res.status(400).json({ error: 'Semaine début/fin introuvable' });
                    }

                    const selectedStartDate = sdWeek.date_debut;
                    const selectedEndDate = sfWeek.date_fin;
                    if (!selectedStartDate || !selectedEndDate || new Date(selectedStartDate) > new Date(selectedEndDate)) {
                        return res.status(400).json({ error: 'Intervalle de semaines invalide' });
                    }

                    const sql = `
                        SELECT s.id_salle, s.nom_salle
                        FROM salles s
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM occupation o
                            LEFT JOIN semestre se_occ ON se_occ.id_semestre = o.id_semestre
                            LEFT JOIN semaine sd_occ ON sd_occ.id_semaine = o.sD
                            LEFT JOIN semaine sf_occ ON sf_occ.id_semaine = o.sF
                            WHERE o.id_annee   = ?
                              AND o.jour       = ?
                              AND o.id_creneau = ?
                              AND o.id_salles  = s.id_salle
                              AND sd_occ.date_debut <= ?
                              AND sf_occ.date_fin >= ?
                              AND COALESCE(
                                  CASE
                                      WHEN LOWER(TRIM(REPLACE(COALESCE(se_occ.type_partit, ''), 'partie', 'partit'))) IN ('partit 1', 'partit 2')
                                          THEN LOWER(TRIM(REPLACE(se_occ.type_partit, 'partie', 'partit')))
                                      WHEN COALESCE(se_occ.nom_semestre, '') REGEXP '^S[0-9]+$'
                                          THEN CASE
                                              WHEN MOD(CAST(SUBSTRING(se_occ.nom_semestre, 2) AS UNSIGNED), 2) = 0 THEN 'partit 2'
                                              ELSE 'partit 1'
                                          END
                                      ELSE NULL
                                  END,
                                  CONCAT('sem:', o.id_semestre)
                              ) = ?
                        )
                        ORDER BY s.nom_salle
                    `;

                    const params = [
                        annee,
                        jour,
                        creneau,
                        selectedEndDate,
                        selectedStartDate,
                        selectedPartit,
                    ];

                    console.log(
                        `[salles_libres] jour=${jour} creneau=${creneau} sd=${sdInt} sf=${sfInt} annee=${annee} semestre=${semestre} group_key=${selectedPartit} range=${selectedStartDate}..${selectedEndDate}`
                    );

                    connection.query(sql, params, (err, results) => {
                        if (err) {
                            console.error('[salles_libres] Erreur SQL:', err.message);
                            return res.status(500).json({ error: err.message });
                        }
                        console.log(`[salles_libres] → ${results.length} salle(s) libre(s) trouvée(s)`);
                        res.json(results);
                    });
                }
            );
        }
    );
});

// =============================================================================
// FILIÈRES — affichées avec nom + année
// =============================================================================

occupation.get('/data/filieres', (req, res) => {
    const { id_semestre } = req.query;

    // Mapping : nom_semestre -> annee filiere
    // S1,S2 -> 1ere annee | S3,S4 -> 2eme annee | S5,S6 -> niveau Bachelor
    const semestreAnneeMap = {
        'S1': '1ere annee', 'S2': '1ere annee',
        'S3': '2eme annee', 'S4': '2eme annee',
    };

    const buildQuery = ({ anneeFiliere = null, bachelorOnly = false } = {}) => {
        let sql = `
            SELECT id_filiere AS id_filier,
                   CONCAT(nom_filiere, ' - ', COALESCE(NULLIF(annee, ''), NULLIF(niveau, ''), 'Sans niveau')) AS nom_filiere,
                   annee, niveau, nb_group
            FROM filiere
        `;
        const params = [];
        if (bachelorOnly) {
            sql += ' WHERE LOWER(COALESCE(niveau, \"\")) = \"bachelor\"';
        } else if (anneeFiliere) {
            sql += ' WHERE annee = ?';
            params.push(anneeFiliere);
        }
        sql += ' ORDER BY nom_filiere';
        connection.query(sql, params, (err, r) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(r);
        });
    };

    if (id_semestre) {
        connection.query(
            'SELECT nom_semestre FROM semestre WHERE id_semestre = ?',
            [id_semestre],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const nomSem = rows[0]?.nom_semestre;
                if (nomSem === 'S5' || nomSem === 'S6') {
                    buildQuery({ bachelorOnly: true });
                    return;
                }
                buildQuery({ anneeFiliere: semestreAnneeMap[nomSem] || null });
            }
        );
    } else {
        buildQuery();
    }
});

// =============================================================================
// MODULES, PROFESSEURS, SEMAINES
// =============================================================================

occupation.get('/data/modules', (req, res) => {
    const { id_filier } = req.query;
    let sql = 'SELECT DISTINCT m.id_module AS id_modul, m.nom_module FROM module_tp m';
    const params = [];
    if (id_filier) {
        sql += ' LEFT JOIN module_filiere mf ON mf.id_module = m.id_module';
        sql += ' WHERE m.id_filiere = ? OR mf.id_filiere = ?';
        params.push(id_filier, id_filier);
    }
    sql += ' ORDER BY m.nom_module';
    connection.query(sql, params, (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

occupation.get('/data/professeurs', (req, res) => {
    const { id_filier } = req.query;
    let sql = `
        SELECT DISTINCT p.id_prof, CONCAT(p.nom, ' ', p.prenom) AS nom_complet
        FROM professeur p
        LEFT JOIN professeur_filiere pf ON pf.id_prof = p.id_prof
    `;
    const params = [];
    if (id_filier) {
        sql += ' WHERE p.id_filiere = ? OR pf.id_filiere = ?';
        params.push(id_filier, id_filier);
    }
    sql += ' ORDER BY p.nom, p.prenom';
    connection.query(sql, params, (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

occupation.get('/data/semaines', (req, res) => {
    const { id_semestre } = req.query;
    let sql = 'SELECT id_semaine, nom_semaine, date_debut, date_fin FROM semaine';
    const params = [];
    if (id_semestre) {
        sql += ' WHERE id_semestre = ?';
        params.push(id_semestre);
    }
    sql += ' ORDER BY date_debut';
    connection.query(sql, params, (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

// =============================================================================
// CRUD OCCUPATION
// =============================================================================

occupation.post('/', (req, res) => {
    console.log("BODY REÇU :", req.body);
    const {
        id_annee, id_semestre, id_creneau, jour,
        id_salles, id_filier, group, id_modul, id_prof,
        sD, sF
    } = req.body;

    if (!id_annee || !id_semestre || !id_creneau || !jour || !id_salles ||
        !id_filier || !group || !id_modul || !id_prof || !sD || !sF) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    connection.query(
        `INSERT INTO occupation 
            (id_annee, id_semestre, id_creneau, jour, id_salles, id_filier, \`group\`, id_modul, id_prof, sD, sF, date_creation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id_annee, id_semestre, id_creneau, jour, id_salles, id_filier, group, id_modul, id_prof, sD, sF],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            const id_occupation = result.insertId;

            connection.query(
                'SELECT id_semaine FROM semaine WHERE id_semaine >= ? AND id_semaine <= ? ORDER BY date_debut',
                [sD, sF],
                (err2, semaines) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    if (semaines.length === 0) {
                        return res.status(201).json({ id_occupation, semaines_liees: 0 });
                    }

                    const values = semaines.map(s => [id_occupation, s.id_semaine]);
                    connection.query(
                        'INSERT INTO occupation_semain (id_occupation, id_semain) VALUES ?',
                        [values],
                        (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            res.status(201).json({ id_occupation, semaines_liees: semaines.length });
                        }
                    );
                }
            );
        }
    );
});

occupation.get('/', (req, res) => {
    const sql = `
        SELECT 
            o.id_occupation, o.jour, o.group, o.date_creation,
            a.libelle            AS annee,
            se.nom_semestre      AS semestre,
            cr.heure_debut, cr.heure_fin,
            sa.nom_salle         AS salle,
            CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
            m.nom_module         AS module,
            CONCAT(p.nom, ' ', p.prenom) AS professeur,
            sd.nom_semaine       AS semaine_debut,
            sf.nom_semaine       AS semaine_fin
        FROM occupation o
        LEFT JOIN annee      a   ON o.id_annee    = a.id_annee
        LEFT JOIN semestre   se  ON o.id_semestre  = se.id_semestre
        LEFT JOIN creneau    cr  ON o.id_creneau   = cr.id_creneau
        LEFT JOIN salles     sa  ON o.id_salles    = sa.id_salle
        LEFT JOIN filiere    f   ON o.id_filier    = f.id_filiere
        LEFT JOIN module_tp  m   ON o.id_modul     = m.id_module
        LEFT JOIN professeur p   ON o.id_prof      = p.id_prof
        LEFT JOIN semaine    sd  ON o.sD           = sd.id_semaine
        LEFT JOIN semaine    sf  ON o.sF           = sf.id_semaine
        ORDER BY FIELD(o.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), cr.heure_debut
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

occupation.delete('/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM occupation WHERE id_occupation = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

occupation.get('/filter', (req, res) => {
    const { id_filier, id_semestre, id_annee } = req.query;
    const conditions = [], params = [];
    if (id_filier)   { conditions.push('o.id_filier = ?');   params.push(id_filier); }
    if (id_semestre) { conditions.push('o.id_semestre = ?'); params.push(id_semestre); }
    if (id_annee)    { conditions.push('o.id_annee = ?');    params.push(id_annee); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
        SELECT 
            o.id_occupation, o.jour, o.group,
            a.libelle AS annee, se.nom_semestre AS semestre,
            cr.heure_debut, cr.heure_fin,
            sa.nom_salle AS salle,
            CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
            m.nom_module AS module,
            CONCAT(p.nom, ' ', p.prenom) AS professeur,
            sd.nom_semaine AS semaine_debut, sf.nom_semaine AS semaine_fin
        FROM occupation o
        LEFT JOIN annee      a   ON o.id_annee    = a.id_annee
        LEFT JOIN semestre   se  ON o.id_semestre  = se.id_semestre
        LEFT JOIN creneau    cr  ON o.id_creneau   = cr.id_creneau
        LEFT JOIN salles     sa  ON o.id_salles    = sa.id_salle
        LEFT JOIN filiere    f   ON o.id_filier    = f.id_filiere
        LEFT JOIN module_tp  m   ON o.id_modul     = m.id_module
        LEFT JOIN professeur p   ON o.id_prof      = p.id_prof
        LEFT JOIN semaine    sd  ON o.sD           = sd.id_semaine
        LEFT JOIN semaine    sf  ON o.sF           = sf.id_semaine
        ${where}
        ORDER BY FIELD(o.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), cr.heure_debut
    `;
    connection.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = occupation;