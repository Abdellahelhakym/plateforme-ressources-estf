const express = require('express');
const config = express.Router();
const connection = require('./db');

config.use(express.json());

// =============================================================================
// 1. ANNÉES — table: annee (id_annee, libelle)
// =============================================================================

config.get('/annee', (req, res) => {
    connection.query(
        'SELECT id_annee, libelle FROM annee ORDER BY libelle DESC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

config.post('/annee', (req, res) => {
    const { libelle } = req.body;
    if (!libelle) return res.status(400).json({ error: "Le libellé est obligatoire" });

    connection.query('INSERT INTO annee (libelle) VALUES (?)', [libelle], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id_annee: result.insertId });
    });
});

config.put('/annee/:id', (req, res) => {
    const { id } = req.params;
    const { libelle } = req.body;
    connection.query('UPDATE annee SET libelle = ? WHERE id_annee = ?', [libelle, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

config.delete('/annee/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM annee WHERE id_annee = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

// =============================================================================
// 2. SEMESTRES — table: semestre (id_semestre, nom_semestre)
// =============================================================================

config.get('/semestre', (req, res) => {
    connection.query(
        'SELECT id_semestre, nom_semestre FROM semestre ORDER BY nom_semestre ASC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

config.post('/semestre', (req, res) => {
    const { nom_semestre } = req.body;
    if (!nom_semestre) return res.status(400).json({ error: "Le nom du semestre est obligatoire" });

    connection.query('INSERT INTO semestre (nom_semestre) VALUES (?)', [nom_semestre], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id_semestre: result.insertId });
    });
});

config.put('/semestre/:id', (req, res) => {
    const { id } = req.params;
    const { nom_semestre } = req.body;
    connection.query('UPDATE semestre SET nom_semestre = ? WHERE id_semestre = ?', [nom_semestre, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

config.delete('/semestre/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM semestre WHERE id_semestre = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

// =============================================================================
// 3. SEMAINES — table: semaine (id_semaine, nom_semaine, date_debut, date_fin, id_semestre)
// =============================================================================

config.get('/semaine', (req, res) => {
    const sql = `
        SELECT s.id_semaine, s.nom_semaine, s.date_debut, s.date_fin,
               s.id_semestre, sem.nom_semestre
        FROM semaine s
        LEFT JOIN semestre sem ON s.id_semestre = sem.id_semestre
        ORDER BY s.date_debut ASC
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

config.post('/semaine', (req, res) => {
    const { nom_semaine, date_debut, date_fin, id_semestre } = req.body;
    if (!nom_semaine || !date_debut || !date_fin || !id_semestre) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires (nom, dates, semestre)" });
    }

    connection.query(
        'INSERT INTO semaine (nom_semaine, date_debut, date_fin, id_semestre) VALUES (?, ?, ?, ?)',
        [nom_semaine, date_debut, date_fin, id_semestre],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id_semaine: result.insertId });
        }
    );
});

config.put('/semaine/:id', (req, res) => {
    const { id } = req.params;
    const { nom_semaine, date_debut, date_fin, id_semestre } = req.body;

    connection.query(
        'UPDATE semaine SET nom_semaine = ?, date_debut = ?, date_fin = ?, id_semestre = ? WHERE id_semaine = ?',
        [nom_semaine, date_debut, date_fin, id_semestre || null, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            res.json({ success: true });
        }
    );
});

config.delete('/semaine/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM semaine WHERE id_semaine = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

// =============================================================================
// 4. CRÉNEAUX — table: creneau (id_creneau, heure_debut, heure_fin, duree)
// =============================================================================

config.get('/creneau', (req, res) => {
    connection.query(
        'SELECT id_creneau, heure_debut, heure_fin, duree FROM creneau ORDER BY heure_debut ASC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

config.post('/creneau', (req, res) => {
    const { heure_debut, heure_fin, duree } = req.body;
    if (!heure_debut || !heure_fin) {
        return res.status(400).json({ error: "Heure début et fin obligatoires" });
    }
    connection.query(
        'INSERT INTO creneau (heure_debut, heure_fin, duree) VALUES (?, ?, ?)',
        [heure_debut, heure_fin, duree || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id_creneau: result.insertId });
        }
    );
});

config.put('/creneau/:id', (req, res) => {
    const { id } = req.params;
    const { heure_debut, heure_fin, duree } = req.body;
    connection.query(
        'UPDATE creneau SET heure_debut = ?, heure_fin = ?, duree = ? WHERE id_creneau = ?',
        [heure_debut, heure_fin, duree || null, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            res.json({ success: true });
        }
    );
});

config.delete('/creneau/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM creneau WHERE id_creneau = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

module.exports = config;