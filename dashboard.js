const express = require('express');
const dashboard = express.Router();
const connection = require('./db');

dashboard.use(express.json());

function getEnseignantId(req) {
    const id = req.session?.enseignant?.id;
    const n = parseInt(id, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
}

// =============================================================================
// DASHBOARD ENSEIGNANT (personnalise)
// =============================================================================

dashboard.get('/enseignant/stats', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });

    const queries = {
        utilisations: 'SELECT COUNT(*) AS total FROM occupation WHERE id_prof = ?',
        filieres: `SELECT COUNT(DISTINCT id_filier) AS total FROM occupation WHERE id_prof = ?`,
        salles: `SELECT COUNT(DISTINCT id_salles) AS total FROM occupation WHERE id_prof = ?`,
        modules: `SELECT COUNT(DISTINCT id_modul) AS total FROM occupation WHERE id_prof = ?`,
        semestres: `SELECT COUNT(DISTINCT id_semestre) AS total FROM occupation WHERE id_prof = ?`,
        jours: `SELECT COUNT(DISTINCT jour) AS total FROM occupation WHERE id_prof = ?`
    };

    const out = {};
    const keys = Object.keys(queries);
    let done = 0;
    keys.forEach(k => {
        connection.query(queries[k], [idProf], (err, rows) => {
            out[k] = err ? 0 : (rows?.[0]?.total || 0);
            done++;
            if (done === keys.length) res.json(out);
        });
    });
});

dashboard.get('/enseignant/filieres', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const sql = `
        SELECT CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere, COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN filiere f ON o.id_filier = f.id_filiere
        WHERE o.id_prof = ?
        GROUP BY o.id_filier, f.nom_filiere, f.annee
        ORDER BY nb DESC
    `;
    connection.query(sql, [idProf], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/salles', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const sql = `
        SELECT s.nom_salle, COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN salles s ON o.id_salles = s.id_salle
        WHERE o.id_prof = ?
        GROUP BY o.id_salles, s.nom_salle
        ORDER BY nb DESC
        LIMIT 12
    `;
    connection.query(sql, [idProf], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/jours', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const sql = `
        SELECT jour, COUNT(*) AS nb
        FROM occupation
        WHERE id_prof = ?
        GROUP BY jour
        ORDER BY FIELD(jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche')
    `;
    connection.query(sql, [idProf], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/emploi', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const sql = `
        SELECT o.jour,
               CONCAT(TIME_FORMAT(cr.heure_debut,'%H:%i'),'-',TIME_FORMAT(cr.heure_fin,'%H:%i')) AS creneau,
               s.nom_salle AS salle,
               m.nom_module AS module,
               CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
               o.\`group\` AS grp,
               sd.nom_semaine AS semaine_debut,
               sf.nom_semaine AS semaine_fin
        FROM occupation o
        LEFT JOIN creneau cr ON o.id_creneau = cr.id_creneau
        LEFT JOIN salles s ON o.id_salles = s.id_salle
        LEFT JOIN module_tp m ON o.id_modul = m.id_module
        LEFT JOIN filiere f ON o.id_filier = f.id_filiere
        LEFT JOIN semaine sd ON o.sD = sd.id_semaine
        LEFT JOIN semaine sf ON o.sF = sf.id_semaine
        WHERE o.id_prof = ?
        ORDER BY FIELD(o.jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), cr.heure_debut
        LIMIT 40
    `;
    connection.query(sql, [idProf], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/recent', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const sql = `
        SELECT o.id_occupation,
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
        WHERE o.id_prof = ?
        ORDER BY o.date_creation DESC
        LIMIT 8
    `;
    connection.query(sql, [idProf], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LISTE DES SEMESTRES (pour filtres)
// GET /dashboard/semestres
// =============================================================================
dashboard.get('/semestres', (req, res) => {
    const sql = 'SELECT id_semestre, nom_semestre FROM semestre ORDER BY nom_semestre';
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LISTE DES PARTITIONS DE SEMESTRES (partit) AVEC PLAGE TEXTE
// GET /dashboard/semestres/partitions
// =============================================================================
dashboard.get('/semestres/partitions', (req, res) => {
    const sql = `
        SELECT type_partit AS partit, nom_semestre
        FROM semestre
        WHERE type_partit IS NOT NULL
        ORDER BY type_partit, nom_semestre
    `;
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const map = new Map();
        (rows || []).forEach(r => {
            if (!map.has(r.partit)) map.set(r.partit, []);
            map.get(r.partit).push(r.nom_semestre);
        });
        const result = Array.from(map.entries()).map(([partit, noms]) => {
            const sorted = noms.filter(Boolean).sort();
            const label = sorted.length ? `${sorted[0]} - ${sorted[sorted.length - 1]}` : `Partie ${partit}`;
            return { partit, label };
        }).sort((a,b) => (a.partit || 0) - (b.partit || 0));
        res.json(result);
    });
});

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
// SALLES LES PLUS UTILISÉES PAR SEMESTRE
// GET /dashboard/salles-par-semestre
// =============================================================================
dashboard.get('/salles-par-semestre', (req, res) => {
    const partit = req.query.partit || null;
    let condition = '1=1';
    let params = [];
    if (partit) {
        condition = 'LOWER(se.type_partit) = LOWER(?)';
        params = [partit];
    }

    const sql = `
        SELECT se.id_semestre, se.nom_semestre, s.nom_salle, COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN salles s    ON o.id_salles   = s.id_salle
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
                WHERE se.nom_semestre IS NOT NULL
                    AND ${condition}
        GROUP BY se.id_semestre, se.nom_semestre, s.id_salle, s.nom_salle
        ORDER BY nb DESC
        LIMIT 15
    `;
    connection.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// PROFESSEURS LES PLUS ACTIFS PAR SEMESTRE
// GET /dashboard/profs-par-semestre
// =============================================================================
dashboard.get('/profs-par-semestre', (req, res) => {
    const partit = req.query.partit || null;
    let condition = '1=1';
    let params = [];
    if (partit) {
        condition = 'LOWER(se.type_partit) = LOWER(?)';
        params = [partit];
    }

    const sql = `
        SELECT se.id_semestre,
               se.nom_semestre,
               CONCAT(p.nom,' ',p.prenom) AS professeur,
               COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN professeur p ON o.id_prof = p.id_prof
        LEFT JOIN semestre se  ON o.id_semestre = se.id_semestre
                WHERE se.nom_semestre IS NOT NULL
                    AND ${condition}
        GROUP BY se.id_semestre, se.nom_semestre, p.id_prof, professeur
        ORDER BY nb DESC
        LIMIT 15
    `;
    connection.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// FILIÈRES LES PLUS UTILISATRICES DES SALLES
// GET /dashboard/filiere-usage
// =============================================================================
dashboard.get('/filiere-usage', (req, res) => {
    const partit = (req.query.partit || '').trim();
    const sql = `
        SELECT TRIM(f.nom_filiere) AS nom_filiere,
               SUM(CASE WHEN o.id_occupation IS NULL THEN 0 ELSE 1 END) AS nb
        FROM filiere f
        LEFT JOIN occupation o 
            ON o.id_filier = f.id_filiere
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        GROUP BY TRIM(f.nom_filiere)
        HAVING nb > 0
        ORDER BY nb DESC
        LIMIT 12
    `;
    connection.query(sql, [partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LIBRE / OCCUPÉ PAR SALLE
// GET /dashboard/salles-libre-occupee
// =============================================================================
dashboard.get('/salles-libre-occupee', (req, res) => {
    const partit = (req.query.partit || '').trim();
    const jour = (req.query.jour || '').trim();
    const weeksSql = partit
        ? `
            SELECT COUNT(DISTINCT s.nom_semaine) AS nb_semaines
            FROM semaine s
            INNER JOIN semestre sm ON s.id_semestre = sm.id_semestre
            WHERE LOWER(sm.type_partit) = LOWER(?)
        `
        : 'SELECT COUNT(DISTINCT nom_semaine) AS nb_semaines FROM semaine';
    const creneauxSql = 'SELECT COUNT(*) AS nb_creneaux FROM creneau';
    connection.query(weeksSql, partit ? [partit] : [], (errW, rowsW) => {
        if (errW) return res.status(500).json({ error: errW.message });
        const nb_semaines = rowsW[0]?.nb_semaines || 0;
        connection.query(creneauxSql, (errC, rowsC) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const nb_creneaux = rowsC[0]?.nb_creneaux || 0;
            const nb_jours = jour ? 1 : 6;
            const totalSlots = nb_semaines * nb_creneaux * nb_jours; // par salle

            const sql = `
                SELECT s.id_salle,
                       s.nom_salle,
                       COALESCE(occ.occupes, 0) AS occupes
                FROM salles s
                LEFT JOIN (
                    SELECT o.id_salles,
                           COUNT(DISTINCT
                               CASE
                                   WHEN sw.nom_semaine IS NOT NULL THEN CONCAT(LOWER(TRIM(sw.nom_semaine)), '|', o.id_creneau)
                                   ELSE CONCAT('occ#', o.id_occupation)
                               END
                           ) AS occupes
                    FROM occupation o
                    LEFT JOIN semestre sm ON sm.id_semestre = o.id_semestre
                    LEFT JOIN semaine sw
                           ON sw.id_semestre = o.id_semestre
                          AND o.sD IS NOT NULL
                          AND o.sF IS NOT NULL
                          AND sw.id_semaine BETWEEN o.sD AND o.sF
                                        WHERE ( ? = '' OR LOWER(sm.type_partit) = LOWER(?) )
                                            AND ( ? = '' OR o.jour = ? )
                    GROUP BY o.id_salles
                ) occ ON occ.id_salles = s.id_salle
                ORDER BY occupes DESC
            `;

                        connection.query(sql, [partit, partit, jour, jour], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const result = (rows || []).map(r => {
                    const occRaw = Number(r.occupes) || 0;
                    const occ    = Math.min(occRaw, totalSlots);
                    const libres = Math.max(totalSlots - occ, 0);
                    const taux   = totalSlots > 0 ? Math.round((occ / totalSlots) * 100) : 0;
                    return { nom_salle: r.nom_salle, occupes: occ, libres, taux };
                });
                res.json({ totalSlots, data: result });
            });
        });
    });
});

// =============================================================================
// OCCUPATIONS PAR JOUR → SALLE × SEMESTRE
// GET /dashboard/jour-salle-semestre?jour=Lundi
// =============================================================================
dashboard.get('/jour-salle-semestre', (req, res) => {
    const jour = req.query.jour || 'Lundi';
    const semId = req.query.semestre || null;
    const partit = req.query.partit || null;

    let extraJoinCondition = '';
    const params = [jour];
    if (partit) {
        extraJoinCondition = `
           AND o.id_semestre IN (
               SELECT id_semestre
               FROM semestre
               WHERE LOWER(type_partit) = LOWER(?)
           )
        `;
        params.push(partit);
    } else if (semId && semId !== 'all') {
        extraJoinCondition = ' AND o.id_semestre = ?';
        params.push(semId);
    }

    const sql = `
        SELECT 
            s.id_salle,
            s.nom_salle,
            f.id_filiere,
            f.nom_filiere,
            se.id_semestre,
            se.nom_semestre,
            SUM(
                CASE 
                    WHEN o.id_occupation IS NULL THEN 0
                    WHEN o.sD IS NOT NULL AND o.sF IS NOT NULL THEN GREATEST(o.sF - o.sD + 1, 1)
                    ELSE 1
                END
            ) AS nb
        FROM salles s
        LEFT JOIN occupation o 
            ON o.id_salles = s.id_salle
           AND o.jour = ?
              ${extraJoinCondition}
        LEFT JOIN filiere  f  ON o.id_filier   = f.id_filiere
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        GROUP BY s.id_salle, s.nom_salle, f.id_filiere, f.nom_filiere, se.id_semestre, se.nom_semestre
                ORDER BY s.nom_salle, nb DESC
    `;

    connection.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
            const toAnneeLabel = (semName) => {
                if (!semName) return '';
                const name = semName.toString().toUpperCase();
                if (name.includes('1') || name.includes('S1') || name.includes('S2')) return '1ere annee';
                if (name.includes('3') || name.includes('S3') || name.includes('S4')) return '2eme annee';
                if (name.includes('5') || name.includes('S5') || name.includes('S6')) return '3eme annee';
                return semName;
            };
        const map = new Map();
        (rows || []).forEach(r => {
            const key = `${r.id_salle || 's'}`;
            if (!map.has(key)) {
                map.set(key, {
                    nom_salle: r.nom_salle || 'Salle ?',
                    total: 0,
                    filieres: []
                });
            }
            const entry = map.get(key);
            const nb = Number(r.nb) || 0;
            entry.total += nb;
            if (r.nom_filiere) {
                const level = toAnneeLabel(r.nom_semestre);
                const label = `${r.nom_filiere}${level ? ' - ' + level : ''}`.trim();
                entry.filieres.push({ nom: label, nb });
            }
        });
        const result = Array.from(map.values()).sort((a, b) => {
            return a.nom_salle.localeCompare(b.nom_salle);
        });
        res.json(result);
    });
});

// =============================================================================
// (Ancien) évolution par semaine et par créneau : retiré du dashboard admin actuel

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
