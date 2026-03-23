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

    if (isNaN(sdInt) || isNaN(sfInt) || sdInt > sfInt) {
        return res.status(400).json({ error: "sd et sf doivent être des entiers valides avec sd <= sf" });
    }

    const sql = `
        SELECT s.id_salle, s.nom_salle
        FROM salles s
        WHERE NOT EXISTS (
            SELECT 1
            FROM occupation o
            WHERE o.id_annee    = ?
              AND o.id_semestre = ?
              AND o.jour        = ?
              AND o.id_creneau  = ?
              AND o.id_salles   = s.id_salle
              AND o.sD <= ?
              AND o.sF >= ?
        )
        ORDER BY s.nom_salle
    `;

    const params = [annee, semestre, jour, creneau, sfInt, sdInt];
    console.log(`[salles_libres] jour=${jour} creneau=${creneau} sd=${sdInt} sf=${sfInt} annee=${annee} semestre=${semestre}`);

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error("[salles_libres] Erreur SQL:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`[salles_libres] → ${results.length} salle(s) libre(s) trouvée(s)`);
        res.json(results);
    });
});

// =============================================================================
// FILIÈRES — affichées avec nom + année
// =============================================================================

occupation.get('/data/filieres', (req, res) => {
    const { id_semestre } = req.query;

    // Mapping : nom_semestre -> annee filiere
    // S1,S2 -> 1ere annee | S3,S4 -> 2eme annee | S5,S6 -> 3eme annee
    const semestreAnneeMap = {
        'S1': '1ere annee', 'S2': '1ere annee',
        'S3': '2eme annee', 'S4': '2eme annee',
        'S5': '3eme annee', 'S6': '3eme annee',
    };

    const buildQuery = (anneeFiliere) => {
        let sql = "SELECT id_filiere AS id_filier, CONCAT(nom_filiere, ' - ', annee) AS nom_filiere, annee, nb_group FROM filiere";
        const params = [];
        if (anneeFiliere) {
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
                buildQuery(semestreAnneeMap[nomSem] || null);
            }
        );
    } else {
        buildQuery(null);
    }
});

// =============================================================================
// MODULES, PROFESSEURS, SEMAINES
// =============================================================================

occupation.get('/data/modules', (req, res) => {
    const { id_filier } = req.query;
    let sql = 'SELECT id_module AS id_modul, nom_module FROM module_tp';
    const params = [];
    if (id_filier) { sql += ' WHERE id_filiere = ?'; params.push(id_filier); }
    sql += ' ORDER BY nom_module';
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