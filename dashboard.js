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
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();

    const queries = {
      utilisations: `
        SELECT COUNT(*) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `,
      filieres: `
        SELECT COUNT(DISTINCT id_filier) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `,
      salles: `
        SELECT COUNT(DISTINCT id_salles) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `,
      modules: `
        SELECT COUNT(DISTINCT id_modul) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `,
      semestres: `
        SELECT COUNT(DISTINCT id_semestre) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `,
      jours: `
        SELECT COUNT(DISTINCT jour) AS total
        FROM occupation
        WHERE id_prof = ?
          AND ( ? = '' OR id_annee = ? )
          AND ( ? = '' OR id_semestre IN (
              SELECT id_semestre
              FROM semestre
              WHERE LOWER(type_partit) = LOWER(?)
          ) )
      `
    };

    const out = {};
    const keys = Object.keys(queries);
    let done = 0;
    keys.forEach(k => {
        connection.query(queries[k], [idProf, annee, annee, partit, partit], (err, rows) => {
            out[k] = err ? 0 : (rows?.[0]?.total || 0);
            done++;
            if (done === keys.length) res.json(out);
        });
    });
});

dashboard.get('/enseignant/filieres', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();
    const sql = `
        SELECT CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere, COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN filiere f ON o.id_filier = f.id_filiere
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE o.id_prof = ?
          AND ( ? = '' OR o.id_annee = ? )
          AND ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        GROUP BY o.id_filier, f.nom_filiere, f.annee
        ORDER BY nb DESC
    `;
    connection.query(sql, [idProf, annee, annee, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/salles', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();
    const sql = `
        SELECT s.nom_salle, COUNT(o.id_occupation) AS nb
        FROM occupation o
        LEFT JOIN salles s ON o.id_salles = s.id_salle
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE o.id_prof = ?
          AND ( ? = '' OR o.id_annee = ? )
          AND ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        GROUP BY o.id_salles, s.nom_salle
        ORDER BY nb DESC
        LIMIT 12
    `;
    connection.query(sql, [idProf, annee, annee, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/jours', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();
    const sql = `
        SELECT jour, COUNT(*) AS nb
        FROM occupation o
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE o.id_prof = ?
          AND ( ? = '' OR o.id_annee = ? )
          AND ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        GROUP BY jour
        ORDER BY FIELD(jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche')
    `;
    connection.query(sql, [idProf, annee, annee, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/emploi', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();
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
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        LEFT JOIN semaine sd ON o.sD = sd.id_semaine
        LEFT JOIN semaine sf ON o.sF = sf.id_semaine
        WHERE o.id_prof = ?
          AND ( ? = '' OR o.id_annee = ? )
          AND ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        ORDER BY FIELD(o.jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), cr.heure_debut
        LIMIT 40
    `;
    connection.query(sql, [idProf, annee, annee, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

dashboard.get('/enseignant/recent', (req, res) => {
    const idProf = getEnseignantId(req);
    if (!idProf) return res.status(401).json({ error: 'Non authentifie' });
    const annee = (req.query.annee || '').trim();
    const partit = (req.query.partit || '').trim();
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
                LEFT JOIN semestre   se ON o.id_semestre = se.id_semestre
        LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
        LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
        WHERE o.id_prof = ?
          AND ( ? = '' OR o.id_annee = ? )
                    AND ( ? = '' OR LOWER(se.type_partit) = LOWER(?) )
        ORDER BY o.date_creation DESC
        LIMIT 8
    `;
        connection.query(sql, [idProf, annee, annee, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LISTE DES SEMESTRES (pour filtres)
// GET /dashboard/semestres
// =============================================================================
dashboard.get('/semestres', (req, res) => {
    const sql = 'SELECT id_semestre, nom_semestre, type_partit FROM semestre ORDER BY nom_semestre';
    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LISTE DES SEMAINES (pour filtres dashboard)
// GET /dashboard/semaines?partit=1|2 or ?semestre=ID
// =============================================================================
dashboard.get('/semaines', (req, res) => {
    const semestre = (req.query.semestre || '').trim();
    const rawPartit = (req.query.partit || '').trim();
    const partit = rawPartit ? (rawPartit.replace(/[^0-9]/g, '') || rawPartit) : '';
        const sql = `
                SELECT s.id_semaine, s.nom_semaine, s.id_semestre, se.nom_semestre
                FROM semaine s
                LEFT JOIN semestre se ON s.id_semestre = se.id_semestre
                WHERE ( ? = '' OR s.id_semestre = ? )
                    AND ( ? = '' OR se.type_partit = ? OR se.type_partit LIKE CONCAT('%', ?, '%') )
                ORDER BY s.date_debut ASC, s.nom_semaine ASC
        `;
        connection.query(sql, [semestre, semestre, partit, partit, partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =============================================================================
// LISTE DES ANNEES UNIVERSITAIRES (pour filtres)
// GET /dashboard/annees
// =============================================================================
dashboard.get('/annees', (req, res) => {
    const sql = 'SELECT id_annee, libelle FROM annee ORDER BY libelle DESC';
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
        const semOrder = (name) => {
            const n = String(name || '').match(/\d+/);
            return n ? parseInt(n[0], 10) : Number.MAX_SAFE_INTEGER;
        };
        const result = Array.from(map.entries()).map(([partit, noms]) => {
            const sorted = noms
                .filter(Boolean)
                .sort((a, b) => semOrder(a) - semOrder(b) || String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
            const label = sorted.length ? sorted.join(' - ') : `Partie ${partit}`;
            return { partit, label };
        }).sort((a,b) => (a.partit || 0) - (b.partit || 0));
        res.json(result);
    });
});

// =============================================================================
// LISTE DES FILIÈRES (pour filtres dashboard)
// GET /dashboard/filieres
// =============================================================================
dashboard.get('/filieres', (req, res) => {
    const sql = `
        SELECT id_filiere, nom_filiere, annee, niveau
        FROM filiere
        ORDER BY nom_filiere, annee
    `;

    connection.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = (rows || []).map((r) => {
            const parts = [r.nom_filiere, r.annee || r.niveau].filter(Boolean);
            return {
                id_filiere: r.id_filiere,
                nom_filiere: r.nom_filiere,
                label: parts.join(' - ')
            };
        });
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
    const filiere = req.query.filiere || null;
    const annee = req.query.annee || null;
    let condition = '1=1';
    let params = [];
    if (partit) {
        condition = 'LOWER(se.type_partit) = LOWER(?)';
        params = [partit];
    }
    if (filiere) {
        condition += ' AND o.id_filier = ?';
        params.push(filiere);
    }
    if (annee) {
        condition += ' AND o.id_annee = ?';
        params.push(annee);
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
    const totalSql = `
        SELECT COUNT(o.id_occupation) AS total
        FROM occupation o
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE se.nom_semestre IS NOT NULL
          AND ${condition}
    `;

    connection.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        connection.query(totalSql, params, (errTot, totals) => {
            if (errTot) return res.status(500).json({ error: errTot.message });
            const total = Number(totals?.[0]?.total) || 0;
            const data = (rows || []).map((r) => {
                const nb = Number(r.nb) || 0;
                const pct = total > 0 ? Math.round((nb / total) * 1000) / 10 : 0;
                return { ...r, pct };
            });
            res.json(data);
        });
    });
});

// =============================================================================
// OCCUPATION DES PROFESSEURS (TABLEAU)
// GET /dashboard/profs-occupation
// =============================================================================
dashboard.get('/profs-occupation', (req, res) => {
    const rawPartit = (req.query.partit || '').trim();
    const partit = rawPartit ? (rawPartit.replace(/[^0-9]/g, '') || rawPartit) : '';
    const jourRaw = (req.query.jour || 'ALL').trim();
    const jour = jourRaw || 'ALL';
    const isAllDays = jour.toUpperCase() === 'ALL';
    const annee = (req.query.annee || '').trim();
    const semaineNom = (req.query.semaineNom || '').trim();
    const semaine = (req.query.semaine || '').trim();

    const weekCountExpr = semaineNom
        ? 'COUNT(DISTINCT LOWER(TRIM(s.nom_semaine)))'
        : 'COUNT(DISTINCT s.id_semaine)';

    let weeksSql = `
        SELECT ${weekCountExpr} AS nb_semaines
        FROM semaine s
        LEFT JOIN semestre se ON se.id_semestre = s.id_semestre
        WHERE ( ? = '' OR se.type_partit = ? OR se.type_partit LIKE CONCAT('%', ?, '%') )
    `;
    const weeksParams = [partit, partit, partit];
    if (semaineNom) {
        // Keep week-name union behavior across semestres when same week label exists.
        weeksSql += ' AND LOWER(TRIM(s.nom_semaine)) = LOWER(TRIM(?))';
        weeksParams.push(semaineNom);
    } else if (semaine) {
        weeksSql += ' AND s.id_semaine = ?';
        weeksParams.push(semaine);
    }

    const creneauxSql = 'SELECT COUNT(*) AS nb_creneaux FROM creneau';
    let semaineFilterSql = '';
    const semaineFilterParams = [];
    if (semaineNom) {
        semaineFilterSql = ' AND sw.nom_semaine IS NOT NULL AND LOWER(TRIM(sw.nom_semaine)) = LOWER(TRIM(?))';
        semaineFilterParams.push(semaineNom);
    } else if (semaine) {
        semaineFilterSql = ' AND sw.id_semaine = ?';
        semaineFilterParams.push(semaine);
    }

    const useFallbackWithoutWeeks = !(semaineNom || semaine);
    const occupiedSlotExpr = semaineNom
        ? 'CONCAT(LOWER(TRIM(sw.nom_semaine)), "|", o.jour, "|", o.id_creneau)'
        : 'CONCAT(sw.id_semaine, "|", o.jour, "|", o.id_creneau)';

    const totalSql = `
        SELECT o.id_prof,
               COUNT(DISTINCT
                   CASE
                       WHEN sw.id_semaine IS NOT NULL THEN ${occupiedSlotExpr}
                       ${useFallbackWithoutWeeks ? "ELSE CONCAT('occ#', o.id_occupation)" : 'ELSE NULL'}
                   END
               ) AS occupes
        FROM occupation o
        LEFT JOIN semestre se ON se.id_semestre = o.id_semestre
        LEFT JOIN semaine sw
               ON sw.id_semestre = o.id_semestre
              AND o.sD IS NOT NULL
              AND o.sF IS NOT NULL
              AND sw.id_semaine BETWEEN o.sD AND o.sF
              ${semaineFilterSql}
        WHERE ( ? = 'ALL' OR o.jour = ? )
          AND ( ? = '' OR o.id_annee = ? )
          AND ( ? = '' OR se.type_partit = ? OR se.type_partit LIKE CONCAT('%', ?, '%') )
        GROUP BY o.id_prof
    `;

    const detailSql = `
        SELECT o.id_prof,
               f.id_filiere,
               CONCAT(
                   COALESCE(TRIM(f.nom_filiere), 'Filiere'),
                   CASE
                       WHEN COALESCE(NULLIF(TRIM(f.annee), ''), NULLIF(TRIM(f.niveau), '')) IS NOT NULL
                           THEN CONCAT(' - ', COALESCE(NULLIF(TRIM(f.annee), ''), NULLIF(TRIM(f.niveau), '')))
                       ELSE ''
                   END
               ) AS filiere_label,
               COUNT(DISTINCT
                   CASE
                       WHEN sw.id_semaine IS NOT NULL THEN ${occupiedSlotExpr}
                       ${useFallbackWithoutWeeks ? "ELSE CONCAT('occ#', o.id_occupation)" : 'ELSE NULL'}
                   END
               ) AS nb
        FROM occupation o
        LEFT JOIN filiere f ON f.id_filiere = o.id_filier
        LEFT JOIN semestre se ON se.id_semestre = o.id_semestre
        LEFT JOIN semaine sw
               ON sw.id_semestre = o.id_semestre
              AND o.sD IS NOT NULL
              AND o.sF IS NOT NULL
              AND sw.id_semaine BETWEEN o.sD AND o.sF
                            ${semaineFilterSql}
                WHERE ( ? = 'ALL' OR o.jour = ? )
                    AND ( ? = '' OR o.id_annee = ? )
                    AND ( ? = '' OR se.type_partit = ? OR se.type_partit LIKE CONCAT('%', ?, '%') )
        GROUP BY o.id_prof, f.id_filiere, filiere_label
        ORDER BY o.id_prof, nb DESC
    `;

        connection.query(weeksSql, weeksParams, (errW, weeksRows) => {
        if (errW) return res.status(500).json({ error: errW.message });
        const nb_semaines = Number(weeksRows?.[0]?.nb_semaines) || 0;

        connection.query(creneauxSql, (errC, creneauxRows) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const nb_creneaux = Number(creneauxRows?.[0]?.nb_creneaux) || 0;
                        const nb_jours = isAllDays ? 6 : 1;
            const totalSlots = nb_semaines * nb_creneaux * nb_jours;

            connection.query('SELECT id_prof, CONCAT(nom, " ", prenom) AS nom_prof FROM professeur ORDER BY nom, prenom', (errP, profRows) => {
                if (errP) return res.status(500).json({ error: errP.message });

                const params = [...semaineFilterParams, jour, jour, annee, annee, partit, partit, partit];
                connection.query(totalSql, params, (errT, totalRows) => {
                    if (errT) return res.status(500).json({ error: errT.message });

                    connection.query(detailSql, params, (errD, detailRows) => {
                        if (errD) return res.status(500).json({ error: errD.message });

                        const map = new Map();
                        (profRows || []).forEach((p) => {
                            map.set(String(p.id_prof), {
                                nom_prof: (p.nom_prof || '').trim() || 'Professeur ?',
                                total: 0,
                                filiereMap: new Map()
                            });
                        });

                        (totalRows || []).forEach((r) => {
                            const key = String(r.id_prof);
                            if (!map.has(key)) return;
                            map.get(key).total = Number(r.occupes) || 0;
                        });

                        (detailRows || []).forEach((r) => {
                            const key = String(r.id_prof);
                            if (!map.has(key)) return;
                            const label = (r.filiere_label || '').trim();
                            if (!label) return;
                            const nb = Number(r.nb) || 0;
                            const current = map.get(key).filiereMap.get(label) || 0;
                            map.get(key).filiereMap.set(label, current + nb);
                        });

                        const result = Array.from(map.values())
                            .filter((entry) => (Number(entry.total) || 0) > 0)
                            .map((entry) => {
                                const cappedTotal = totalSlots > 0 ? Math.min(entry.total, totalSlots) : entry.total;
                                const taux = totalSlots > 0 ? Math.round((cappedTotal / totalSlots) * 100) : 0;
                                const filieres = Array.from(entry.filiereMap.entries())
                                    .map(([nom, nb]) => {
                                        const cappedNb = totalSlots > 0 ? Math.min(nb, totalSlots) : nb;
                                        const filiereTaux = totalSlots > 0 ? Math.round((cappedNb / totalSlots) * 100) : 0;
                                        return { nom, nb: cappedNb, taux: filiereTaux };
                                    })
                                    .sort((a, b) => b.taux - a.taux || a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

                                return {
                                    nom_prof: entry.nom_prof,
                                    total: cappedTotal,
                                    taux,
                                    filieres
                                };
                            })
                            .sort((a, b) => a.nom_prof.localeCompare(b.nom_prof, 'fr', { sensitivity: 'base' }));

                        res.json({ totalSlots, data: result });
                    });
                });
            });
        });
    });
});

// =============================================================================
// PROFESSEURS LES PLUS ACTIFS PAR SEMESTRE
// GET /dashboard/profs-par-semestre
// =============================================================================
dashboard.get('/profs-par-semestre', (req, res) => {
    const partit = req.query.partit || null;
    const filiere = req.query.filiere || null;
    const annee = req.query.annee || null;
    let condition = '1=1';
    let params = [];
    if (partit) {
        condition = 'LOWER(se.type_partit) = LOWER(?)';
        params = [partit];
    }
    if (filiere) {
        condition += ' AND o.id_filier = ?';
        params.push(filiere);
    }
    if (annee) {
        condition += ' AND o.id_annee = ?';
        params.push(annee);
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
    const totalSql = `
        SELECT COUNT(o.id_occupation) AS total
        FROM occupation o
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        WHERE se.nom_semestre IS NOT NULL
          AND ${condition}
    `;

    connection.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        connection.query(totalSql, params, (errTot, totals) => {
            if (errTot) return res.status(500).json({ error: errTot.message });
            const total = Number(totals?.[0]?.total) || 0;
            const data = (rows || []).map((r) => {
                const nb = Number(r.nb) || 0;
                const pct = total > 0 ? Math.round((nb / total) * 1000) / 10 : 0;
                return { ...r, pct };
            });
            res.json(data);
        });
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
    const annee = (req.query.annee || '').trim();
    const weeksSql = partit
        ? `
            SELECT COUNT(DISTINCT s.nom_semaine) AS nb_semaines
            FROM semaine s
            INNER JOIN semestre sm ON s.id_semestre = sm.id_semestre
            WHERE LOWER(sm.type_partit) = LOWER(?)
        `
        : 'SELECT COUNT(DISTINCT nom_semaine) AS nb_semaines FROM semaine';
    const creneauxSql = 'SELECT COUNT(*) AS nb_creneaux FROM creneau';
    const weeksParams = partit ? [partit] : [];
    connection.query(weeksSql, weeksParams, (errW, rowsW) => {
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
                                            AND ( ? = '' OR o.id_annee = ? )
                    GROUP BY o.id_salles
                ) occ ON occ.id_salles = s.id_salle
                ORDER BY occupes DESC
            `;

                        connection.query(sql, [partit, partit, jour, jour, annee, annee], (err, rows) => {
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
// OCCUPATION DES SALLES PAR SEMAINE
// GET /dashboard/salles-occupation-semaine?annee=&partit=&semaine=
// =============================================================================
dashboard.get('/salles-occupation-semaine', (req, res) => {
    const annee = (req.query.annee || '').trim();
    const rawPartit = (req.query.partit || req.query.semestre || '').trim();
    const partit = rawPartit ? (rawPartit.replace(/[^0-9]/g, '') || rawPartit) : '';
    const semaineNom = (req.query.semaineNom || '').trim();
    const semaine = (req.query.semaine || '').trim();

    const weekCountExpr = semaineNom
        ? 'COUNT(DISTINCT LOWER(TRIM(s.nom_semaine)))'
        : 'COUNT(DISTINCT s.id_semaine)';

    let weeksSql = `
        SELECT ${weekCountExpr} AS nb_semaines
        FROM semaine s
        LEFT JOIN semestre sm ON sm.id_semestre = s.id_semestre
        WHERE ( ? = '' OR sm.type_partit = ? OR sm.type_partit LIKE CONCAT('%', ?, '%') )
    `;
    const weeksParams = [partit, partit, partit];
    if (semaineNom) {
        weeksSql += ' AND LOWER(TRIM(s.nom_semaine)) = LOWER(TRIM(?))';
        weeksParams.push(semaineNom);
    } else if (semaine) {
        weeksSql += ' AND s.id_semaine = ?';
        weeksParams.push(semaine);
    }

    let semaineFilterSql = '';
    const semaineFilterParams = [];
    if (semaineNom) {
        semaineFilterSql = ' AND sw.nom_semaine IS NOT NULL AND LOWER(TRIM(sw.nom_semaine)) = LOWER(TRIM(?))';
        semaineFilterParams.push(semaineNom);
    } else if (semaine) {
        semaineFilterSql = ' AND sw.id_semaine = ?';
        semaineFilterParams.push(semaine);
    }

    const useFallbackWithoutWeeks = !(semaineNom || semaine);
    const occupiedSlotKeySql = semaineNom
        ? 'CONCAT(LOWER(TRIM(sw.nom_semaine)), "|", o.jour, "|", o.id_creneau)'
        : 'CONCAT(sw.id_semaine, "|", o.jour, "|", o.id_creneau)';

    const creneauxSql = 'SELECT COUNT(*) AS nb_creneaux FROM creneau';

    connection.query(weeksSql, weeksParams, (errW, rowsW) => {
        if (errW) return res.status(500).json({ error: errW.message });
        const nb_semaines = rowsW[0]?.nb_semaines || 0;
        connection.query(creneauxSql, (errC, rowsC) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const nb_creneaux = rowsC[0]?.nb_creneaux || 0;
            const nb_jours = 6;
            const totalSlots = nb_semaines * nb_creneaux * nb_jours;

            const sql = `
                SELECT s.id_salle,
                       s.nom_salle,
                       COALESCE(occ.occupes, 0) AS occupes
                FROM salles s
                LEFT JOIN (
                    SELECT o.id_salles,
                           COUNT(DISTINCT
                               CASE
                                   WHEN sw.id_semaine IS NOT NULL THEN ${occupiedSlotKeySql}
                                   ${useFallbackWithoutWeeks ? "ELSE CONCAT('occ#', o.id_occupation)" : 'ELSE NULL'}
                               END
                           ) AS occupes
                    FROM occupation o
                    LEFT JOIN semestre sm ON sm.id_semestre = o.id_semestre
                    LEFT JOIN semaine sw
                           ON sw.id_semestre = o.id_semestre
                          AND o.sD IS NOT NULL
                          AND o.sF IS NOT NULL
                          AND sw.id_semaine BETWEEN o.sD AND o.sF
                                        WHERE ( ? = '' OR o.id_annee = ? )
                                            AND ( ? = '' OR sm.type_partit = ? OR sm.type_partit LIKE CONCAT('%', ?, '%') )
                                            ${semaineFilterSql}
                    GROUP BY o.id_salles
                ) occ ON occ.id_salles = s.id_salle
                ORDER BY occupes DESC, s.nom_salle
            `;

            const params = [annee, annee, partit, partit, partit, ...semaineFilterParams];
            connection.query(sql, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const result = (rows || []).map(r => {
                    const occRaw = Number(r.occupes) || 0;
                    const occ = Math.min(occRaw, totalSlots);
                    const libres = Math.max(totalSlots - occ, 0);
                    const taux = totalSlots > 0 ? Math.round((occ / totalSlots) * 100) : 0;
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
    const jourRaw = (req.query.jour || 'Lundi').trim();
    const jour = jourRaw || 'Lundi';
    const isAllDays = jour.toUpperCase() === 'ALL';
    const semId = (req.query.semestre || '').trim();
    const rawPartit = (req.query.partit || '').trim();
    const partit = rawPartit ? (rawPartit.replace(/[^0-9]/g, '') || rawPartit) : '';
    const annee = (req.query.annee || '').trim();
    const semaineNom = (req.query.semaineNom || '').trim();
    const semaine = (req.query.semaine || '').trim();

    let extraJoinCondition = '';
    const extraJoinParams = [];
    if (partit) {
        extraJoinCondition = `
           AND o.id_semestre IN (
               SELECT id_semestre
               FROM semestre
               WHERE type_partit = ?
                  OR type_partit LIKE CONCAT('%', ?, '%')
           )
        `;
        extraJoinParams.push(partit, partit);
    } else if (semId && semId !== 'all') {
        extraJoinCondition = ' AND o.id_semestre = ?';
        extraJoinParams.push(semId);
    }

    const weekCountExpr = semaineNom
        ? 'COUNT(DISTINCT LOWER(TRIM(s.nom_semaine)))'
        : 'COUNT(DISTINCT s.id_semaine)';

    let weeksSql = `
        SELECT ${weekCountExpr} AS nb_semaines
        FROM semaine s
        LEFT JOIN semestre sm ON sm.id_semestre = s.id_semestre
        WHERE 1=1
    `;
    const weeksParams = [];
    if (partit) {
        weeksSql += ' AND (sm.type_partit = ? OR sm.type_partit LIKE CONCAT("%", ?, "%"))';
        weeksParams.push(partit, partit);
    } else if (semId && semId !== 'all') {
        weeksSql += ' AND s.id_semestre = ?';
        weeksParams.push(semId);
    }
    if (semaineNom) {
        weeksSql += ' AND LOWER(TRIM(s.nom_semaine)) = LOWER(TRIM(?))';
        weeksParams.push(semaineNom);
    } else if (semaine) {
        weeksSql += ' AND s.id_semaine = ?';
        weeksParams.push(semaine);
    }

    let semaineFilterSql = '';
    const semaineFilterParams = [];
    if (semaineNom) {
        semaineFilterSql = ' AND sw.nom_semaine IS NOT NULL AND LOWER(TRIM(sw.nom_semaine)) = LOWER(TRIM(?))';
        semaineFilterParams.push(semaineNom);
    } else if (semaine) {
        semaineFilterSql = ' AND sw.id_semaine = ?';
        semaineFilterParams.push(semaine);
    }

    const useFallbackWithoutWeeks = !(semaineNom || semaine);
    const occupiedSlotKeySql = semaineNom
        ? 'CONCAT(LOWER(TRIM(sw.nom_semaine)), "|", o.jour, "|", o.id_creneau)'
        : 'CONCAT(sw.id_semaine, "|", o.jour, "|", o.id_creneau)';

    const totalSql = `
        SELECT
            o.id_salles,
            COUNT(DISTINCT
                CASE
                    WHEN sw.id_semaine IS NOT NULL THEN ${occupiedSlotKeySql}
                    ${useFallbackWithoutWeeks ? "ELSE CONCAT('occ#', o.id_occupation)" : 'ELSE NULL'}
                END
            ) AS occupes
        FROM occupation o
        LEFT JOIN semaine sw
               ON sw.id_semestre = o.id_semestre
              AND o.sD IS NOT NULL
              AND o.sF IS NOT NULL
              AND sw.id_semaine BETWEEN o.sD AND o.sF
              ${semaineFilterSql}
        WHERE ( ? = 'ALL' OR o.jour = ? )
          ${extraJoinCondition}
          AND ( ? = '' OR o.id_annee = ? )
        GROUP BY o.id_salles
    `;

    const detailSql = `
        SELECT
            o.id_salles,
            f.id_filiere,
            f.nom_filiere,
            se.id_semestre,
            se.nom_semestre,
            COUNT(DISTINCT
                CASE
                    WHEN sw.id_semaine IS NOT NULL THEN ${occupiedSlotKeySql}
                    ${useFallbackWithoutWeeks ? "ELSE CONCAT('occ#', o.id_occupation)" : 'ELSE NULL'}
                END
            ) AS nb
        FROM occupation o
        LEFT JOIN filiere  f  ON o.id_filier   = f.id_filiere
        LEFT JOIN semestre se ON o.id_semestre = se.id_semestre
        LEFT JOIN semaine sw
               ON sw.id_semestre = o.id_semestre
              AND o.sD IS NOT NULL
              AND o.sF IS NOT NULL
              AND sw.id_semaine BETWEEN o.sD AND o.sF
              ${semaineFilterSql}
        WHERE ( ? = 'ALL' OR o.jour = ? )
          ${extraJoinCondition}
          AND ( ? = '' OR o.id_annee = ? )
        GROUP BY o.id_salles, f.id_filiere, f.nom_filiere, se.id_semestre, se.nom_semestre
        ORDER BY o.id_salles, nb DESC
    `;

    // IMPORTANT: semaineFilterSql placeholders are inside the JOIN, before WHERE placeholders.
    // Keep parameters in SQL placeholder order so week filtering binds correctly.
    const params = [...semaineFilterParams, jour, jour, ...extraJoinParams, annee, annee];

    const creneauxSql = 'SELECT COUNT(*) AS nb_creneaux FROM creneau';
    connection.query(weeksSql, weeksParams, (errW, rowsW) => {
        if (errW) return res.status(500).json({ error: errW.message });
        const nb_semaines = Number(rowsW?.[0]?.nb_semaines) || 0;

        connection.query(creneauxSql, (errC, rowsC) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const nb_creneaux = Number(rowsC?.[0]?.nb_creneaux) || 0;
            const nb_jours = isAllDays ? 6 : 1;
            const totalSlots = nb_semaines * nb_creneaux * nb_jours;

            connection.query('SELECT id_salle, nom_salle FROM salles ORDER BY nom_salle', (errS, sallesRows) => {
                if (errS) return res.status(500).json({ error: errS.message });

                connection.query(totalSql, params, (errT, totalRows) => {
                    if (errT) return res.status(500).json({ error: errT.message });

                    connection.query(detailSql, params, (errD, detailRows) => {
                        if (errD) return res.status(500).json({ error: errD.message });

                        const toAnneeLabel = (semName) => {
                            if (!semName) return '';
                            const name = semName.toString().toUpperCase();
                            if (name.includes('1') || name.includes('S1') || name.includes('S2')) return '1ere annee';
                            if (name.includes('3') || name.includes('S3') || name.includes('S4')) return '2eme annee';
                            if (name.includes('5') || name.includes('S5') || name.includes('S6')) return '3eme annee';
                            return semName;
                        };

                        const map = new Map();
                        (sallesRows || []).forEach((s) => {
                            map.set(String(s.id_salle), {
                                nom_salle: s.nom_salle || 'Salle ?',
                                total: 0,
                                filiereMap: new Map()
                            });
                        });

                        (totalRows || []).forEach((r) => {
                            const key = String(r.id_salles);
                            if (!map.has(key)) return;
                            map.get(key).total = Number(r.occupes) || 0;
                        });

                        (detailRows || []).forEach((r) => {
                            const key = String(r.id_salles);
                            if (!map.has(key)) return;
                            if (!r.nom_filiere) return;

                            const entry = map.get(key);
                            const nb = Number(r.nb) || 0;
                            const level = toAnneeLabel(r.nom_semestre);
                            const label = `${r.nom_filiere}${level ? ' - ' + level : ''}`.trim();
                            const current = entry.filiereMap.get(label) || 0;
                            entry.filiereMap.set(label, current + nb);
                        });

                        const result = Array.from(map.values())
                            .map((entry) => {
                                const cappedTotal = totalSlots > 0 ? Math.min(entry.total, totalSlots) : entry.total;
                                const taux = totalSlots > 0 ? Math.round((cappedTotal / totalSlots) * 100) : 0;
                                const filieres = Array.from(entry.filiereMap.entries())
                                    .map(([nom, nb]) => {
                                        const cappedNb = totalSlots > 0 ? Math.min(nb, totalSlots) : nb;
                                        const filiereTaux = totalSlots > 0 ? Math.round((cappedNb / totalSlots) * 100) : 0;
                                        return { nom, nb: cappedNb, taux: filiereTaux };
                                    })
                                    .sort((a, b) => b.taux - a.taux || a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

                                return {
                                    nom_salle: entry.nom_salle,
                                    total: cappedTotal,
                                    taux,
                                    filieres
                                };
                            })
                            .sort((a, b) => a.nom_salle.localeCompare(b.nom_salle));

                        res.json({ totalSlots, data: result });
                    });
                });
            });
        });
    });
});

// =============================================================================
// (Ancien) évolution par semaine et par créneau : retiré du dashboard admin actuel

// =============================================================================
// DERNIÈRES OCCUPATIONS CRÉÉES (activité récente)
// GET /dashboard/recent
// =============================================================================
dashboard.get('/recent', (req, res) => {
    const annee = req.query.annee || '';
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
        WHERE ( ? = '' OR o.id_annee = ? )
        ORDER BY o.date_creation DESC
        LIMIT 8
    `;
    connection.query(sql, [annee, annee], (err, rows) => {
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
