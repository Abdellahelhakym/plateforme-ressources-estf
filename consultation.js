const express = require('express');
const consultation = express.Router();
const connection = require('./db');

consultation.use(express.json());

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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
    connection.query('SELECT id_semestre, nom_semestre FROM semestre ORDER BY nom_semestre', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

// ── NOUVEAU : liste des filières ─────────────────────────────────────────────
consultation.get('/data/filieres', (req, res) => {
    const sql = `
        SELECT id_filiere,
               CONCAT(nom_filiere, ' — ', annee) AS label,
               nom_filiere,
               annee
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

    connection.query('DELETE FROM occupation_semain WHERE id_occupation = ?', [id], (err1) => {
        if (err1) return res.status(500).json({ error: err1.message });
        connection.query('DELETE FROM occupation WHERE id_occupation = ?', [id], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Occupation non trouvée' });
            res.json({ success: true, id_supprime: id });
        });
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
// DÉTAIL COMPLET SALLE (toutes semaines)
// GET /consultation/salle/detail?id_salle=X[&id_annee=Y&id_semestre=Z]
// =============================================================================
consultation.get('/salle/detail', (req, res) => {
    const id_salle    = parseInt(req.query.id_salle,    10);
    const id_annee    = req.query.id_annee    ? parseInt(req.query.id_annee,    10) : null;
    const id_semestre = req.query.id_semestre ? parseInt(req.query.id_semestre, 10) : null;

    if (isNaN(id_salle)) return res.status(400).json({ error: 'id_salle est obligatoire' });

    let sqlSem = 'SELECT id_semaine, nom_semaine, date_debut, date_fin FROM semaine';
    const paramsSem = [];
    if (id_semestre) { sqlSem += ' WHERE id_semestre = ?'; paramsSem.push(id_semestre); }
    sqlSem += ' ORDER BY date_debut';

    const sqlCr = 'SELECT id_creneau, heure_debut, heure_fin FROM creneau ORDER BY heure_debut';

    let sqlOcc = `
        SELECT o.id_occupation, o.jour, o.id_creneau, o.\`group\`, o.sD, o.sF,
               cr.heure_debut, cr.heure_fin,
               CONCAT(f.nom_filiere, ' - ', f.annee) AS filiere,
               m.nom_module   AS module,
               CONCAT(p.nom,' ',p.prenom) AS professeur
        FROM occupation o
        LEFT JOIN creneau    cr ON o.id_creneau = cr.id_creneau
        LEFT JOIN filiere    f  ON o.id_filier  = f.id_filiere
        LEFT JOIN module_tp  m  ON o.id_modul   = m.id_module
        LEFT JOIN professeur p  ON o.id_prof    = p.id_prof
        WHERE o.id_salles = ?
    `;
    const paramsOcc = [id_salle];
    if (id_annee)    { sqlOcc += ' AND o.id_annee = ?';    paramsOcc.push(id_annee); }
    if (id_semestre) { sqlOcc += ' AND o.id_semestre = ?'; paramsOcc.push(id_semestre); }

    connection.query(sqlSem, paramsSem, (errS, semaines) => {
        if (errS) return res.status(500).json({ error: errS.message });
        const semainesSafe = semaines || [];

        connection.query(sqlCr, (errC, creneaux) => {
            if (errC) return res.status(500).json({ error: errC.message });
            const creneauxSafe = creneaux || [];

            connection.query(sqlOcc, paramsOcc, (errO, occupations) => {
                if (errO) return res.status(500).json({ error: errO.message });
                const occupationsSafe = occupations || [];

                const result = semainesSafe.map(sem => {
                    const grille = {};
                    let occupes = 0;
                    JOURS.forEach(jour => {
                        grille[jour] = {};
                        creneauxSafe.forEach(cr => {
                            const found = occupationsSafe.find(o =>
                                o.jour === jour &&
                                Number(o.id_creneau) === Number(cr.id_creneau) &&
                                Number(o.sD) <= Number(sem.id_semaine) &&
                                Number(o.sF) >= Number(sem.id_semaine)
                            );
                            if (found) occupes++;
                            grille[jour][cr.id_creneau] = found
                                ? { statut: 'occupee', ...found }
                                : { statut: 'libre', heure_debut: cr.heure_debut, heure_fin: cr.heure_fin };
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