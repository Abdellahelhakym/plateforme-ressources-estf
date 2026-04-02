const express = require('express');
const consultation = express.Router();
const connection = require('./db');

consultation.use(express.json());

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SEMESTER_GROUPS = {
    G1: ['S1', 'S3', 'S5'],
    G2: ['S2', 'S4', 'S6']
};

// =============================================================================
// DONNÉES DE RÉFÉRENCE
// =============================================================================

consultation.get('/data/salles', (req, res) => {
    connection.query('SELECT id_salle, nom_salle FROM salles ORDER BY nom_salle', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

consultation.get('/data/semaines', (req, res) => {
    const { id_semestre } = req.query;
    let sql = 'SELECT id_semaine, nom_semaine, date_debut, date_fin FROM semaine';
    const params = [];
    if (id_semestre) { sql += ' WHERE id_semestre = ?'; params.push(id_semestre); }
    sql += ' ORDER BY date_debut';
    connection.query(sql, params, (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

consultation.get('/data/annees', (req, res) => {
    connection.query('SELECT id_annee, libelle FROM annee ORDER BY libelle DESC', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

consultation.get('/data/semestres', (req, res) => {
    connection.query('SELECT id_semestre, nom_semestre, type_partit FROM semestre ORDER BY nom_semestre', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

consultation.get('/data/semaines-par-partie', (req, res) => {
    const type_partit = String(req.query.type_partit || '').trim().toLowerCase();
    if (!type_partit) return res.status(400).json({ error: 'type_partit est obligatoire' });

    const sql = `
        SELECT se.nom_semaine,
               MIN(se.date_debut) AS date_debut,
               MAX(se.date_fin)   AS date_fin
        FROM semaine se
        INNER JOIN semestre sm ON sm.id_semestre = se.id_semestre
        WHERE LOWER(sm.type_partit) = ?
          AND se.nom_semaine IS NOT NULL
          AND se.nom_semaine <> ''
        GROUP BY se.nom_semaine
        ORDER BY MIN(se.date_debut)
    `;

    connection.query(sql, [type_partit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ── NOUVEAU : liste des filières ─────────────────────────────────────────────
consultation.get('/data/filieres', (req, res) => {
    const sql = `
        SELECT id_filiere,
               CONCAT(nom_filiere, ' — ', COALESCE(NULLIF(annee, ''), NULLIF(niveau, ''), 'Sans niveau')) AS label,
               nom_filiere,
               annee,
               niveau
        FROM filiere
        ORDER BY nom_filiere, annee
    `;
    connection.query(sql, (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

// =============================================================================
// SUPPRIMER UNE OCCUPATION
// =============================================================================
consultation.delete('/occupation/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'id_occupation invalide' });

    connection.query('DELETE FROM occupation WHERE id_occupation = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Occupation non trouvée' });
        res.json({ success: true, id_supprime: id });
    });
});

// =============================================================================
// EMPLOI DU TEMPS SALLE × SEMAINE
// GET /consultation/salle?id_salle=X&id_semaine=Y[&id_annee=Z&id_semestre=W]
// =============================================================================
consultation.get('/salle', (req, res) => {
    const id_salle    = parseInt(req.query.id_salle,    10);
    const id_semaine  = parseInt(req.query.id_semaine,  10);
    const id_annee    = req.query.id_annee    ? parseInt(req.query.id_annee,    10) : null;
    const id_semestre = req.query.id_semestre ? parseInt(req.query.id_semestre, 10) : null;

    if (isNaN(id_salle) || isNaN(id_semaine))
        return res.status(400).json({ error: 'id_salle et id_semaine sont obligatoires' });

    const sqlCr = 'SELECT id_creneau, heure_debut, heure_fin FROM creneau ORDER BY heure_debut';

    let sqlOcc = `
        SELECT o.id_occupation, o.jour, o.id_creneau, o.\`group\`,
               cr.heure_debut, cr.heure_fin,
               CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
               m.nom_module   AS module,
               CONCAT(p.nom,' ',p.prenom) AS professeur,
               sd.nom_semaine AS semaine_debut,
               sf.nom_semaine AS semaine_fin
        FROM occupation o
        LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
        LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
        LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
        LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
        LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
        LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
        WHERE o.id_salles = ?
          AND o.sD <= ? AND o.sF >= ?
    `;
    const params = [id_salle, id_semaine, id_semaine];
    if (id_annee)    { sqlOcc += ' AND o.id_annee = ?';    params.push(id_annee); }
    if (id_semestre) { sqlOcc += ' AND o.id_semestre = ?'; params.push(id_semestre); }

    connection.query(sqlCr, (errC, creneaux) => {
        if (errC) return res.status(500).json({ error: errC.message });
        if (!creneaux || creneaux.length === 0)
            return res.json({ creneaux: [], grille: {}, stats: { total: 0, occupes: 0, libres: 0, taux: 0 } });

        connection.query(sqlOcc, params, (errO, occupations) => {
            if (errO) return res.status(500).json({ error: errO.message });
            const occ = occupations || [];

            const grille = {};
            let occupes = 0;
            JOURS.forEach(jour => {
                grille[jour] = {};
                creneaux.forEach(cr => {
                    const found = occ.find(o =>
                        o.jour === jour && Number(o.id_creneau) === Number(cr.id_creneau)
                    );
                    if (found) occupes++;
                    grille[jour][cr.id_creneau] = found
                        ? { statut: 'occupee', ...found }
                        : { statut: 'libre', heure_debut: cr.heure_debut, heure_fin: cr.heure_fin };
                });
            });

            const total = JOURS.length * creneaux.length;
            res.json({
                creneaux,
                grille,
                stats: { total, occupes, libres: total - occupes, taux: Math.round((occupes / total) * 100) }
            });
        });
    });
});

// =============================================================================
// EMPLOI DU TEMPS SALLE × PARTIE DE SEMESTRES × SEMAINE
// GET /consultation/salle/partie?id_salle=X&type_partit=partit%201&nom_semaine=...
// =============================================================================
consultation.get('/salle/partie', (req, res) => {
    const id_salle = parseInt(req.query.id_salle, 10);
    const id_annee = req.query.id_annee ? parseInt(req.query.id_annee, 10) : null;
    const type_partit = String(req.query.type_partit || '').trim().toLowerCase();
    const nom_semaine = String(req.query.nom_semaine || '').trim();

    if (isNaN(id_salle)) return res.status(400).json({ error: 'id_salle est obligatoire' });
    if (!type_partit) return res.status(400).json({ error: 'type_partit est obligatoire' });
    if (!nom_semaine) return res.status(400).json({ error: 'nom_semaine est obligatoire' });

    const sqlCr = 'SELECT id_creneau, heure_debut, heure_fin FROM creneau ORDER BY heure_debut';
    const sqlSem = 'SELECT id_semestre, nom_semestre FROM semestre WHERE LOWER(type_partit) = ? ORDER BY nom_semestre';

    connection.query(sqlSem, [type_partit], (errS, semestresRows) => {
        if (errS) return res.status(500).json({ error: errS.message });
        const semestres = semestresRows || [];
        if (!semestres.length) return res.json({ creneaux: [], semestres: [] });

        const semIds = semestres.map(s => s.id_semestre);
        const placeholders = semIds.map(() => '?').join(',');

        const sqlSemaines = `
            SELECT id_semestre, id_semaine, nom_semaine
            FROM semaine
            WHERE nom_semaine = ?
              AND id_semestre IN (${placeholders})
        `;

        let sqlOcc = `
            SELECT o.id_occupation, o.id_semestre, o.jour, o.id_creneau, o.\`group\`, o.sD, o.sF,
                   cr.heure_debut, cr.heure_fin,
                 se.nom_semestre,
                   CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
                   m.nom_module AS module,
                   CONCAT(p.nom,' ',p.prenom) AS professeur,
                   sd.nom_semaine AS semaine_debut,
                   sf.nom_semaine AS semaine_fin
            FROM occupation o
            LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
             LEFT JOIN semestre   se ON o.id_semestre = se.id_semestre
            LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
            LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
            LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
            LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
            LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
            WHERE o.id_salles = ?
              AND o.id_semestre IN (${placeholders})
        `;

        const paramsOcc = [id_salle, ...semIds];
        if (id_annee) {
            sqlOcc += ' AND o.id_annee = ?';
            paramsOcc.push(id_annee);
        }

        connection.query(sqlCr, (errC, creneauxRows) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const creneaux = creneauxRows || [];

            connection.query(sqlSemaines, [nom_semaine, ...semIds], (errW, semainesRows) => {
                if (errW) return res.status(500).json({ error: errW.message });
                const semaineBySem = {};
                (semainesRows || []).forEach(w => {
                    semaineBySem[String(w.id_semestre)] = Number(w.id_semaine);
                });

                connection.query(sqlOcc, paramsOcc, (errO, occupationsRows) => {
                    if (errO) return res.status(500).json({ error: errO.message });
                    const occupations = occupationsRows || [];

                    const semestresResult = semestres.map(sem => {
                        const weekId = semaineBySem[String(sem.id_semestre)] || null;
                        const semOcc = occupations.filter(o => Number(o.id_semestre) === Number(sem.id_semestre));

                        const grille = {};
                        let occupes = 0;

                        JOURS.forEach(jour => {
                            grille[jour] = {};
                            creneaux.forEach(cr => {
                                const matches = weekId
                                    ? semOcc.filter(o =>
                                        o.jour === jour &&
                                        Number(o.id_creneau) === Number(cr.id_creneau) &&
                                        Number(o.sD) <= Number(weekId) &&
                                        Number(o.sF) >= Number(weekId)
                                    )
                                    : [];

                                if (!matches.length) {
                                    grille[jour][cr.id_creneau] = {
                                        statut: 'libre',
                                        heure_debut: cr.heure_debut,
                                        heure_fin: cr.heure_fin
                                    };
                                    return;
                                }

                                occupes++;
                                grille[jour][cr.id_creneau] = {
                                    statut: 'occupee',
                                    items: matches.map(m => ({
                                        id_occupation: m.id_occupation,
                                        nom_semestre: m.nom_semestre,
                                        module: m.module,
                                        filiere: m.filiere,
                                        professeur: m.professeur,
                                        group: m.group,
                                        heure_debut: m.heure_debut,
                                        heure_fin: m.heure_fin,
                                        semaine_debut: m.semaine_debut,
                                        semaine_fin: m.semaine_fin,
                                    }))
                                };
                            });
                        });

                        const total = JOURS.length * creneaux.length;
                        return {
                            semestre: sem,
                            semaine: nom_semaine,
                            hasSemaine: Boolean(weekId),
                            grille,
                            stats: {
                                total,
                                occupes,
                                libres: total - occupes,
                                taux: total > 0 ? Math.round((occupes / total) * 100) : 0
                            }
                        };
                    });

                    return res.json({
                        creneaux,
                        nom_semaine,
                        type_partit,
                        semestres: semestresResult
                    });
                });
            });
        });
    });
});

// =============================================================================
// DÉTAIL COMPLET SALLE (toutes semaines)
// GET /consultation/salle/detail?id_salle=X[&id_annee=Y&id_semestre=Z][&type_partit=partit%201]
// =============================================================================
consultation.get('/salle/detail', (req, res) => {
    const id_salle       = parseInt(req.query.id_salle, 10);
    const id_annee       = req.query.id_annee ? parseInt(req.query.id_annee, 10) : null;
    const id_semestre    = req.query.id_semestre ? parseInt(req.query.id_semestre, 10) : null;
    const type_partit    = String(req.query.type_partit || '').trim().toLowerCase();
    const semestre_group = req.query.semestre_group;

    if (isNaN(id_salle)) return res.status(400).json({ error: 'id_salle est obligatoire' });

    const sqlCr = 'SELECT id_creneau, heure_debut, heure_fin FROM creneau ORDER BY heure_debut';

    // Nouveau mode : retour groupé par semestres parallèles (G1 = S1/S3/S5, G2 = S2/S4/S6)
    if (semestre_group && SEMESTER_GROUPS[semestre_group]) {
        const groupSemestres = SEMESTER_GROUPS[semestre_group];
        const placeholders = groupSemestres.map(() => '?').join(', ');

        const sqlSemestres = `
            SELECT id_semestre, nom_semestre
            FROM semestre
            WHERE nom_semestre IN (${placeholders})
            ORDER BY FIELD(nom_semestre, ${placeholders})
        `;

        connection.query(sqlSemestres, [...groupSemestres, ...groupSemestres], (errSem, semestresRows) => {
            if (errSem) return res.status(500).json({ error: errSem.message });

            const semestres = semestresRows || [];
            if (!semestres.length) {
                return res.json({ mode: 'group', group: semestre_group, creneaux: [], semestres: [] });
            }

            const semesterIds = semestres.map(s => s.id_semestre);
            const idsPlaceholders = semesterIds.map(() => '?').join(', ');

            let sqlOccGroup = `
                SELECT o.id_occupation, o.id_semestre, o.jour, o.id_creneau, o.\`group\`,
                       cr.heure_debut, cr.heure_fin,
                       CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
                       m.nom_module   AS module,
                       CONCAT(p.nom,' ',p.prenom) AS professeur,
                       sd.nom_semaine AS semaine_debut,
                       sf.nom_semaine AS semaine_fin
                FROM occupation o
                LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
                LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
                LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
                LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
                LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
                LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
                WHERE o.id_salles = ?
                  AND o.id_semestre IN (${idsPlaceholders})
            `;

            const paramsOccGroup = [id_salle, ...semesterIds];
            if (id_annee) {
                sqlOccGroup += ' AND o.id_annee = ?';
                paramsOccGroup.push(id_annee);
            }

            connection.query(sqlCr, (errC, creneaux) => {
                if (errC) return res.status(500).json({ error: errC.message });
                const creneauxSafe = creneaux || [];

                connection.query(sqlOccGroup, paramsOccGroup, (errO, occupations) => {
                    if (errO) return res.status(500).json({ error: errO.message });
                    const occupationsSafe = occupations || [];

                    const grouped = semestres.map(sem => {
                        const semOcc = occupationsSafe.filter(o => Number(o.id_semestre) === Number(sem.id_semestre));
                        const grille = {};
                        let occupes = 0;

                        JOURS.forEach(jour => {
                            grille[jour] = {};
                            creneauxSafe.forEach(cr => {
                                const matches = semOcc.filter(o =>
                                    o.jour === jour && Number(o.id_creneau) === Number(cr.id_creneau)
                                );

                                if (!matches.length) {
                                    grille[jour][cr.id_creneau] = {
                                        statut: 'libre',
                                        heure_debut: cr.heure_debut,
                                        heure_fin: cr.heure_fin
                                    };
                                    return;
                                }

                                occupes++;
                                grille[jour][cr.id_creneau] = {
                                    statut: 'occupee',
                                    items: matches.map(o => ({
                                        id_occupation: o.id_occupation,
                                        module: o.module,
                                        filiere: o.filiere,
                                        professeur: o.professeur,
                                        group: o.group,
                                        heure_debut: o.heure_debut,
                                        heure_fin: o.heure_fin,
                                        semaine_debut: o.semaine_debut,
                                        semaine_fin: o.semaine_fin,
                                    }))
                                };
                            });
                        });

                        const total = JOURS.length * creneauxSafe.length;
                        return {
                            semestre: sem,
                            grille,
                            stats: {
                                total,
                                occupes,
                                libres: total - occupes,
                                taux: total > 0 ? Math.round((occupes / total) * 100) : 0
                            }
                        };
                    });

                    return res.json({
                        mode: 'group',
                        group: semestre_group,
                        creneaux: creneauxSafe,
                        semestres: grouped
                    });
                });
            });
        });

        return;
    }

    let sqlSem = `
        SELECT se.id_semaine,
               se.nom_semaine,
               se.date_debut,
               se.date_fin,
               se.id_semestre,
               sm.nom_semestre,
               sm.type_partit
        FROM semaine se
        LEFT JOIN semestre sm ON sm.id_semestre = se.id_semestre
        WHERE 1=1
    `;
    const paramsSem = [];
    if (id_semestre) {
        sqlSem += ' AND se.id_semestre = ?';
        paramsSem.push(id_semestre);
    }
    if (type_partit) {
        sqlSem += ' AND LOWER(sm.type_partit) = ?';
        paramsSem.push(type_partit);
    }
    sqlSem += ' ORDER BY se.date_debut';

    connection.query(sqlSem, paramsSem, (errS, semaines) => {
        if (errS) return res.status(500).json({ error: errS.message });
        const semainesSafe = semaines || [];

        if (!semainesSafe.length) {
            return res.json({ creneaux: [], semaines: [] });
        }

        const semestresAutorises = Array.from(new Set(semainesSafe.map(s => Number(s.id_semestre)).filter(Number.isFinite)));
        if (!semestresAutorises.length) {
            return res.json({ creneaux: [], semaines: [] });
        }

        const semaineIdsParSemNom = {};
        const semaineUniqueParNom = {};
        semainesSafe.forEach((s) => {
            const semId = Number(s.id_semestre);
            const nom = String(s.nom_semaine || '').trim();
            if (!semId || !nom) return;

            if (!semaineIdsParSemNom[semId]) semaineIdsParSemNom[semId] = {};
            if (!semaineIdsParSemNom[semId][nom]) semaineIdsParSemNom[semId][nom] = [];
            semaineIdsParSemNom[semId][nom].push(Number(s.id_semaine));

            if (!semaineUniqueParNom[nom]) {
                semaineUniqueParNom[nom] = {
                    nom_semaine: nom,
                    date_debut: s.date_debut,
                    date_fin: s.date_fin
                };
            }
        });

        const semainesFusionnees = Object.values(semaineUniqueParNom)
            .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

        const placeholders = semestresAutorises.map(() => '?').join(',');
        let sqlOcc = `
            SELECT o.id_occupation, o.id_semestre, o.jour, o.id_creneau, o.\`group\`, o.sD, o.sF,
                   cr.heure_debut, cr.heure_fin,
                 se.nom_semestre,
                   CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
                   m.nom_module   AS module,
                   CONCAT(p.nom,' ',p.prenom) AS professeur,
                   sd.nom_semaine AS semaine_debut,
                   sf.nom_semaine AS semaine_fin
            FROM occupation o
            LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
             LEFT JOIN semestre   se ON o.id_semestre = se.id_semestre
            LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
            LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
            LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
            LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
            LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
            WHERE o.id_salles = ?
              AND o.id_semestre IN (${placeholders})
        `;
        const paramsOcc = [id_salle, ...semestresAutorises];
        if (id_annee) {
            sqlOcc += ' AND o.id_annee = ?';
            paramsOcc.push(id_annee);
        }

        connection.query(sqlCr, (errC, creneaux) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const creneauxSafe = creneaux || [];

            connection.query(sqlOcc, paramsOcc, (errO, occupations) => {
                if (errO) return res.status(500).json({ error: errO.message });
                const occupationsSafe = occupations || [];

                const result = semainesFusionnees.map((sem) => {
                    const weekName = String(sem.nom_semaine || '').trim();
                    const grille = {};
                    let occupes = 0;

                    JOURS.forEach((jour) => {
                        grille[jour] = {};
                        creneauxSafe.forEach((cr) => {
                            const matches = occupationsSafe.filter((o) => {
                                if (o.jour !== jour) return false;
                                if (Number(o.id_creneau) !== Number(cr.id_creneau)) return false;
                                const semId = Number(o.id_semestre);
                                const idsSemaine = semaineIdsParSemNom[semId]?.[weekName] || [];
                                if (!idsSemaine.length) return false;
                                return idsSemaine.some((weekId) => Number(o.sD) <= Number(weekId) && Number(o.sF) >= Number(weekId));
                            });

                            if (!matches.length) {
                                grille[jour][cr.id_creneau] = {
                                    statut: 'libre',
                                    heure_debut: cr.heure_debut,
                                    heure_fin: cr.heure_fin
                                };
                                return;
                            }

                            occupes++;
                            grille[jour][cr.id_creneau] = {
                                statut: 'occupee',
                                items: matches.map((m) => ({
                                    id_occupation: m.id_occupation,
                                    nom_semestre: m.nom_semestre,
                                    module: m.module,
                                    filiere: m.filiere,
                                    professeur: m.professeur,
                                    group: m.group,
                                    heure_debut: m.heure_debut,
                                    heure_fin: m.heure_fin,
                                    semaine_debut: m.semaine_debut,
                                    semaine_fin: m.semaine_fin
                                }))
                            };
                        });
                    });

                    const total = JOURS.length * creneauxSafe.length;
                    return {
                        semaine: sem,
                        grille,
                        stats: {
                            total,
                            occupes,
                            libres: total - occupes,
                            taux: total > 0 ? Math.round((occupes / total) * 100) : 0
                        }
                    };
                });

                res.json({ creneaux: creneauxSafe, semaines: result });
            });
        });
    });
});

// =============================================================================
// ── NOUVEAU : EMPLOI DU TEMPS FILIÈRE × SEMAINE ──────────────────────────────
// GET /consultation/filiere?id_filiere=X&id_semaine=Y[&id_annee=Z&id_semestre=W]
//
// Retourne la grille des cours planifiés pour une filière donnée,
// avec pour chaque créneau : module, salle, professeur, groupe.
// Plusieurs groupes peuvent coexister sur le même créneau/jour.
// =============================================================================
consultation.get('/filiere', (req, res) => {
    const id_filiere  = parseInt(req.query.id_filiere,  10);
    const id_semaine  = parseInt(req.query.id_semaine,  10);
    const id_annee    = req.query.id_annee    ? parseInt(req.query.id_annee,    10) : null;
    const id_semestre = req.query.id_semestre ? parseInt(req.query.id_semestre, 10) : null;

    if (isNaN(id_filiere) || isNaN(id_semaine))
        return res.status(400).json({ error: 'id_filiere et id_semaine sont obligatoires' });

    const sqlCr = 'SELECT id_creneau, heure_debut, heure_fin FROM creneau ORDER BY heure_debut';

    let sqlOcc = `
        SELECT o.id_occupation,
               o.jour,
               o.id_creneau,
               o.\`group\`,
               cr.heure_debut,
               cr.heure_fin,
               m.nom_module               AS module,
               s.nom_salle                AS salle,
               CONCAT(p.nom,' ',p.prenom) AS professeur,
               sd.nom_semaine             AS semaine_debut,
               sf.nom_semaine             AS semaine_fin
        FROM occupation o
        LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
        LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
        LEFT JOIN salles     s  ON o.id_salles  = s.id_salle
        LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
        LEFT JOIN semaine    sd ON o.sD         = sd.id_semaine
        LEFT JOIN semaine    sf ON o.sF         = sf.id_semaine
        WHERE o.id_filier = ?
          AND o.sD <= ? AND o.sF >= ?
    `;
    const params = [id_filiere, id_semaine, id_semaine];
    if (id_annee)    { sqlOcc += ' AND o.id_annee = ?';    params.push(id_annee); }
    if (id_semestre) { sqlOcc += ' AND o.id_semestre = ?'; params.push(id_semestre); }

    connection.query(sqlCr, (errC, creneaux) => {
        if (errC) return res.status(500).json({ error: errC.message });
        if (!creneaux || creneaux.length === 0)
            return res.json({ creneaux: [], grille: {}, groupes: [], stats: { total: 0, occupes: 0, libres: 0, taux: 0 } });

        connection.query(sqlOcc, params, (errO, occupations) => {
            if (errO) return res.status(500).json({ error: errO.message });
            const occ = occupations || [];

            // Groupes distincts présents dans le résultat
            const groupes = [...new Set(occ.map(o => o.group).filter(Boolean))].sort();

            // Construction de la grille
            // Une case peut contenir plusieurs cours (groupes différents)
            const grille = {};
            let occupes = 0;

            JOURS.forEach(jour => {
                grille[jour] = {};
                creneaux.forEach(cr => {
                    const matches = occ.filter(o =>
                        o.jour === jour && Number(o.id_creneau) === Number(cr.id_creneau)
                    );

                    if (matches.length === 0) {
                        grille[jour][cr.id_creneau] = { statut: 'libre' };
                    } else {
                        occupes++; // compte le créneau comme occupé (peu importe le nb de groupes)
                        grille[jour][cr.id_creneau] = {
                            statut: 'occupee',
                            items: matches.map(o => ({
                                id_occupation : o.id_occupation,
                                module        : o.module,
                                salle         : o.salle,
                                professeur    : o.professeur,
                                group         : o.group,
                                heure_debut   : o.heure_debut,
                                heure_fin     : o.heure_fin,
                                semaine_debut : o.semaine_debut,
                                semaine_fin   : o.semaine_fin,
                            }))
                        };
                    }
                });
            });

            const total = JOURS.length * creneaux.length;
            res.json({
                creneaux,
                grille,
                groupes,
                stats: {
                    total,
                    occupes,
                    libres : total - occupes,
                    taux   : total > 0 ? Math.round((occupes / total) * 100) : 0
                }
            });
        });
    });
});

module.exports = consultation;