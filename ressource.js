const express = require('express');
const ressource = express.Router();

const connection = require('./db');

ressource.use(express.json());

// =============================================================================
// 1. FILIÈRES
// =============================================================================

ressource.get('/filiere', (req, res) => {
    connection.query(
        'SELECT id_filiere AS id, nom_filiere, niveau, nb_group FROM filiere ORDER BY nom_filiere ASC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

ressource.post('/filiere', (req, res) => {
    const { nom_filiere, niveau, nb_group } = req.body;
    if (!nom_filiere || !niveau || !nb_group) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    connection.query(
        'INSERT INTO filiere (nom_filiere, niveau, nb_group) VALUES (?, ?, ?)',
        [nom_filiere, niveau, nb_group],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId });
        }
    );
});

ressource.put('/filiere/:id', (req, res) => {
    const { id } = req.params;
    const { nom_filiere, niveau, nb_group } = req.body;

    connection.query(
        'UPDATE filiere SET nom_filiere = ?, niveau = ?, nb_group = ? WHERE id_filiere = ?',
        [nom_filiere, niveau, nb_group, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            res.json({ success: true });
        }
    );
});

ressource.delete('/filiere/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM filiere WHERE id_filiere = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

// =============================================================================
// 2. PROFESSEURS
// =============================================================================

ressource.get('/professeur', (req, res) => {
    connection.query(
        'SELECT id_prof AS id, nom, prenom, email, departement FROM professeur ORDER BY nom, prenom',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

ressource.post('/professeur', (req, res) => {
    const { nom, prenom, email, departement } = req.body;
    if (!nom || !prenom || !email || !departement) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    connection.query(
        'INSERT INTO professeur (nom, prenom, email, departement) VALUES (?, ?, ?, ?)',
        [nom, prenom, email, departement],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId });
        }
    );
});

ressource.put('/professeur/:id', (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, departement } = req.body;

    connection.query(
        'UPDATE professeur SET nom = ?, prenom = ?, email = ?, departement = ? WHERE id_prof = ?',
        [nom, prenom, email, departement, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            res.json({ success: true });
        }
    );
});

ressource.delete('/professeur/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM professeur WHERE id_prof = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

// =============================================================================
// 3. MODULES TP
// =============================================================================

ressource.get('/module', (req, res) => {
    const sql = `
        SELECT 
            m.id_module,
            m.nom_module,
            f.nom_filiere AS filiere,
            m.id_filiere
        FROM module_tp m
        LEFT JOIN filiere f ON m.id_filiere = f.id_filiere
        ORDER BY m.nom_module ASC
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

ressource.post('/module', (req, res) => {
    const { nom_module, id_filiere } = req.body;
    if (!nom_module || !id_filiere) {
        return res.status(400).json({ error: "Nom et filière obligatoires" });
    }

    connection.query(
        'INSERT INTO module_tp (nom_module, id_filiere) VALUES (?, ?)',
        [nom_module, id_filiere],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId });
        }
    );
});

ressource.put('/module/:id', (req, res) => {
    const { id } = req.params;
    const { nom_module, id_filiere } = req.body;

    connection.query(
        'UPDATE module_tp SET nom_module = ?, id_filiere = ? WHERE id_module = ?',
        [nom_module, id_filiere, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            res.json({ success: true });
        }
    );
});

ressource.delete('/module/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM module_tp WHERE id_module = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
        res.json({ success: true });
    });
});

module.exports = ressource;