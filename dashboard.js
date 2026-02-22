const express = require('express');
const dashboard = express.Router();
const connection = require('./db');

dashboard.use(express.json());

// =============================================================================
// STATISTIQUES GLOBALES
// GET /dashboard/stats
// =============================================================================
dashboard.get('/stats', (req, res) => {
    const queries = {
        salles:       'SELECT COUNT(*) AS total FROM salles',
        professeurs:  'SELECT COUNT(*) AS total FROM professeur',
        filieres:     'SELECT COUNT(*) AS total FROM filiere',
        modules:      'SELECT COUNT(*) AS total FROM module_tp',
        occupations:  'SELECT COUNT(*) AS total FROM occupation',
        semaines:     'SELECT COUNT(*) AS total FROM semaine',
        groupes:      'SELECT SUM(nb_group) AS total FROM filiere',
    };

    const results = {};
    const keys = Object.keys(queries);
    let done = 0;

    keys.forEach(key => {
        connection.query(queries[key], (err, rows) => {
            if (err) {
                results[key] = 0;
            } else {
                results[key] = rows[0].total || 0;
            }
            done++;
            if (done === keys.length) {
                res.json(results);
            }
        });
    });
});

// =============================================================================
// TAUX D'OCCUPATION PAR JOUR (sur toutes les semaines)
// GET /dashboard/taux-par-jour
// =============================================================================
dashboard.get('/taux-par-jour', (req, res) => {
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    const sql = `
        SELECT jour, COUNT(*) AS nb_occupations
        FROM occupation
        GROUP BY jour
        ORDER BY FIELD(jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche')
    `;

    // Nombre total de salles × créneaux (pour calculer le taux max théorique)
    const sqlTotal = `
        SELECT 
            (SELECT COUNT(*) FROM salles) AS nb_salles,
            (SELECT COUNT(*) FROM creneau) AS nb_creneaux,
            (SELECT COUNT(*) FROM semaine) AS nb_semaines
    `;

    connection.query(sqlTotal, (errT, totaux) => {
        if (errT) return res.status(500).json({ error: errT.message });
        const { nb_salles, nb_creneaux } = totaux[0];
        const maxParJour = nb_salles * nb_creneaux;

        connection.query(sql, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const map = {};
            rows.forEach(r => { map[r.jour] = r.nb_occupations; });

            const data = jours.map(j => ({
                jour: j,
                nb: map[j] || 0,
                taux: maxParJour > 0 ? Math.round(((map[j] || 0) / maxParJour) * 100) : 0
            }));

            res.json({ data, maxParJour });
        });
    });
});

// =============================================================================
// TOP 10 SALLES LES PLUS OCCUPÉES
// GET /dashboard/top-salles
// =============================================================================
dashboard.get('/top-salles', (req, res) => {
    const sql = `
        SELECT s.nom_salle, COUNT(o.id_occupation) AS nb
        FROM salles s
        LEFT JOIN occupation o ON o.id_salles = s.id_salle
        GROUP BY s.id_salle, s.nom_salle
        ORDER BY nb DESC
        LIMIT 10
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// TOP PROFESSEURS (par nombre de créneaux occupés)
// GET /dashboard/top-profs
// =============================================================================
dashboard.get('/top-profs', (req, res) => {
    const sql = `
        SELECT CONCAT(p.nom, ' ', p.prenom) AS nom_complet, COUNT(o.id_occupation) AS nb
        FROM professeur p
        LEFT JOIN occupation o ON o.id_prof = p.id_prof
        GROUP BY p.id_prof
        ORDER BY nb DESC
        LIMIT 8
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// OCCUPATION PAR FILIÈRE
// GET /dashboard/par-filiere
// =============================================================================
dashboard.get('/par-filiere', (req, res) => {
    const sql = `
        SELECT f.nom_filiere, COUNT(o.id_occupation) AS nb
        FROM filiere f
        LEFT JOIN occupation o ON o.id_filier = f.id_filiere
        GROUP BY f.id_filiere, f.nom_filiere
        ORDER BY nb DESC
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// OCCUPATION PAR SEMAINE (évolution temporelle)
// GET /dashboard/par-semaine
// =============================================================================
dashboard.get('/par-semaine', (req, res) => {
    const sql = `
        SELECT 
            s.id_semaine,
            s.nom_semaine,
            s.date_debut,
            COUNT(DISTINCT os.id_occupation) AS nb_occupations
        FROM semaine s
        LEFT JOIN occupation_semain os ON os.id_semain = s.id_semaine
        GROUP BY s.id_semaine, s.nom_semaine, s.date_debut
        ORDER BY s.date_debut
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// OCCUPATION PAR CRÉNEAU HORAIRE
// GET /dashboard/par-creneau
// =============================================================================
dashboard.get('/par-creneau', (req, res) => {
    const sql = `
        SELECT 
            cr.id_creneau,
            CONCAT(TIME_FORMAT(cr.heure_debut,'%H:%i'), ' - ', TIME_FORMAT(cr.heure_fin,'%H:%i')) AS label,
            COUNT(o.id_occupation) AS nb
        FROM creneau cr
        LEFT JOIN occupation o ON o.id_creneau = cr.id_creneau
        GROUP BY cr.id_creneau, cr.heure_debut, cr.heure_fin
        ORDER BY cr.heure_debut
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// DERNIÈRES OCCUPATIONS CRÉÉES (activité récente)
// GET /dashboard/recent
// =============================================================================
dashboard.get('/recent', (req, res) => {
    const sql = `
        SELECT 
            o.id_occupation,
            o.jour,
            o.date_creation,
            o.\`group\`,
            s.nom_salle  AS salle,
            f.nom_filiere AS filiere,
            m.nom_module  AS module,
            CONCAT(p.nom,' ',p.prenom) AS professeur,
            CONCAT(TIME_FORMAT(cr.heure_debut,'%H:%i'),'-',TIME_FORMAT(cr.heure_fin,'%H:%i')) AS creneau,
            sd.nom_semaine AS semaine_debut,
            sf.nom_semaine AS semaine_fin
        FROM occupation o
        LEFT JOIN salles     s  ON o.id_salles  = s.id_salle
        LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
        LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
        LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
        LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
        LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
        LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
        ORDER BY o.date_creation DESC
        LIMIT 8
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =============================================================================
// RÉSUMÉ PAR ANNÉE & SEMESTRE
// GET /dashboard/par-annee-semestre
// =============================================================================
dashboard.get('/par-annee-semestre', (req, res) => {
    const sql = `
        SELECT 
            a.libelle AS annee,
            se.nom_semestre AS semestre,
            COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN annee    a  ON o.id_annee    = a.id_annee
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        GROUP BY a.id_annee, a.libelle, se.id_semestre, se.nom_semestre
        ORDER BY a.libelle DESC, se.nom_semestre
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = dashboard;
