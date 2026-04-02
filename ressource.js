const express = require('express');
const ressource = express.Router();
const bcrypt = require('bcrypt');

const connection = require('./db');
const SALT_ROUNDS = 10;

ressource.use(express.json());

function normalizeFiliereIds(input) {
    if (!input) return [];
    const raw = Array.isArray(input) ? input : String(input).split(',');
    const ids = raw
        .map(v => parseInt(v, 10))
        .filter(v => Number.isInteger(v) && v > 0);
    return Array.from(new Set(ids));
}

function syncProfFilieres(idProf, filiereIds, done) {
    connection.query('DELETE FROM professeur_filiere WHERE id_prof = ?', [idProf], (err) => {
        if (err) return done(err);
        if (!filiereIds.length) return done(null);
        const values = filiereIds.map(fid => [idProf, fid]);
        connection.query('INSERT INTO professeur_filiere (id_prof, id_filiere) VALUES ?', [values], done);
    });
}

function syncModuleFilieres(idModule, filiereIds, done) {
    connection.query('DELETE FROM module_filiere WHERE id_module = ?', [idModule], (err) => {
        if (err) return done(err);
        if (!filiereIds.length) return done(null);
        const values = filiereIds.map(fid => [idModule, fid]);
        connection.query('INSERT INTO module_filiere (id_module, id_filiere) VALUES ?', [values], done);
    });
}

// =============================================================================
// 1. FILIÈRES
// =============================================================================

ressource.get('/filiere', (req, res) => {
    connection.query(
        'SELECT id_filiere AS id, nom_filiere, annee, niveau, nb_group FROM filiere ORDER BY nom_filiere ASC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

ressource.post('/filiere', (req, res) => {
    const { nom_filiere, annee, niveau, nb_group } = req.body;
    const isBachelor = String(niveau || '').toLowerCase() === 'bachelor';
    const normalizedAnnee = isBachelor ? '' : annee;

    if (!nom_filiere || !niveau || !nb_group || (!isBachelor && !normalizedAnnee)) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    connection.query(
        'INSERT INTO filiere (nom_filiere, annee, niveau, nb_group) VALUES (?, ?, ?, ?)',
        [nom_filiere, normalizedAnnee, niveau, nb_group],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: result.insertId });
        }
    );
});

ressource.put('/filiere/:id', (req, res) => {
    const { id } = req.params;
    const { nom_filiere, annee, niveau, nb_group } = req.body;
    const isBachelor = String(niveau || '').toLowerCase() === 'bachelor';
    const normalizedAnnee = isBachelor ? '' : annee;

    if (!nom_filiere || !niveau || !nb_group || (!isBachelor && !normalizedAnnee)) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    connection.query(
        'UPDATE filiere SET nom_filiere = ?, annee = ?, niveau = ?, nb_group = ? WHERE id_filiere = ?',
        [nom_filiere, normalizedAnnee, niveau, nb_group, id],
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
        `SELECT p.id_prof AS id, p.nom, p.prenom, p.email, p.departement, p.id_filiere,
                COALESCE(
                    NULLIF(GROUP_CONCAT(DISTINCT pf.id_filiere ORDER BY pf.id_filiere SEPARATOR ','), ''),
                    CASE WHEN p.id_filiere IS NOT NULL THEN CAST(p.id_filiere AS CHAR) ELSE '' END
                ) AS id_filieres,
                COALESCE(
                    NULLIF(GROUP_CONCAT(DISTINCT CONCAT(f.nom_filiere, ' - ', COALESCE(NULLIF(f.annee, ''), NULLIF(f.niveau, ''), 'Sans niveau')) ORDER BY f.nom_filiere SEPARATOR ', '), ''),
                    CONCAT(f0.nom_filiere, ' - ', COALESCE(NULLIF(f0.annee, ''), NULLIF(f0.niveau, ''), 'Sans niveau'))
                ) AS filieres
         FROM professeur p
         LEFT JOIN professeur_filiere pf ON pf.id_prof = p.id_prof
         LEFT JOIN filiere f ON pf.id_filiere = f.id_filiere
         LEFT JOIN filiere f0 ON p.id_filiere = f0.id_filiere
         GROUP BY p.id_prof, p.nom, p.prenom, p.email, p.departement, p.id_filiere, f0.nom_filiere, f0.annee, f0.niveau
         ORDER BY p.nom, p.prenom`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json((results || []).map(r => ({ ...r, filier: r.filieres || null })));
        }
    );
});

ressource.post('/professeur', (req, res) => {
    const { nom, prenom, email, departement, id_filiere, id_filieres, password } = req.body;
    const filiereIds = normalizeFiliereIds(id_filieres || id_filiere);
    const principalFiliere = filiereIds[0] || null;
    if (!nom || !prenom || !email || !departement || !password) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    bcrypt.hash(password, SALT_ROUNDS)
        .then((passwordHash) => {
            connection.query(
                'INSERT INTO professeur (nom, prenom, email, departement, id_filiere, password) VALUES (?, ?, ?, ?, ?, ?)',
                [nom, prenom, email, departement, principalFiliere, passwordHash],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const newId = result.insertId;
                    syncProfFilieres(newId, filiereIds, (errSync) => {
                        if (errSync) return res.status(500).json({ error: errSync.message });
                        res.status(201).json({ id: newId });
                    });
                }
            );
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

ressource.put('/professeur/:id', (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, departement, id_filiere, id_filieres, password } = req.body;
    const filiereIds = normalizeFiliereIds(id_filieres || id_filiere);
    const principalFiliere = filiereIds[0] || null;

    const updateProfesseur = (passwordHash) => {
        let sql = 'UPDATE professeur SET nom = ?, prenom = ?, email = ?, departement = ?, id_filiere = ?';
        const params = [nom, prenom, email, departement, principalFiliere];

        if (passwordHash) {
            sql += ', password = ?';
            params.push(passwordHash);
        }

        sql += ' WHERE id_prof = ?';
        params.push(id);

        connection.query(sql, params, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            syncProfFilieres(id, filiereIds, (errSync) => {
                if (errSync) return res.status(500).json({ error: errSync.message });
                res.json({ success: true });
            });
        });
    };

    if (password && password.trim()) {
        bcrypt.hash(password, SALT_ROUNDS)
            .then((passwordHash) => updateProfesseur(passwordHash))
            .catch((err) => res.status(500).json({ error: err.message }));
        return;
    }

    updateProfesseur(null);
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
            m.id_filiere,
            COALESCE(
                NULLIF(GROUP_CONCAT(DISTINCT mf.id_filiere ORDER BY mf.id_filiere SEPARATOR ','), ''),
                CASE WHEN m.id_filiere IS NOT NULL THEN CAST(m.id_filiere AS CHAR) ELSE '' END
            ) AS id_filieres,
            COALESCE(
                NULLIF(GROUP_CONCAT(DISTINCT CONCAT(f.nom_filiere, ' - ', COALESCE(NULLIF(f.annee, ''), NULLIF(f.niveau, ''), 'Sans niveau')) ORDER BY f.nom_filiere SEPARATOR ', '), ''),
                CONCAT(f0.nom_filiere, ' - ', COALESCE(NULLIF(f0.annee, ''), NULLIF(f0.niveau, ''), 'Sans niveau'))
            ) AS filieres
        FROM module_tp m
        LEFT JOIN module_filiere mf ON mf.id_module = m.id_module
        LEFT JOIN filiere f ON mf.id_filiere = f.id_filiere
        LEFT JOIN filiere f0 ON m.id_filiere = f0.id_filiere
        GROUP BY m.id_module, m.nom_module, m.id_filiere, f0.nom_filiere, f0.annee, f0.niveau
        ORDER BY m.nom_module ASC
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

ressource.post('/module', (req, res) => {
    const { nom_module, id_filiere, id_filieres } = req.body;
    const filiereIds = normalizeFiliereIds(id_filieres || id_filiere);
    const principalFiliere = filiereIds[0] || null;

    if (!nom_module || !principalFiliere) {
        return res.status(400).json({ error: "Nom et au moins une filière obligatoires" });
    }

    connection.query(
        'INSERT INTO module_tp (nom_module, id_filiere) VALUES (?, ?)',
        [nom_module, principalFiliere],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            const newId = result.insertId;
            syncModuleFilieres(newId, filiereIds, (errSync) => {
                if (errSync) return res.status(500).json({ error: errSync.message });
                res.status(201).json({ id: newId });
            });
        }
    );
});

ressource.put('/module/:id', (req, res) => {
    const { id } = req.params;
    const { nom_module, id_filiere, id_filieres } = req.body;
    const filiereIds = normalizeFiliereIds(id_filieres || id_filiere);
    const principalFiliere = filiereIds[0] || null;

    if (!nom_module || !principalFiliere) {
        return res.status(400).json({ error: "Nom et au moins une filière obligatoires" });
    }

    connection.query(
        'UPDATE module_tp SET nom_module = ?, id_filiere = ? WHERE id_module = ?',
        [nom_module, principalFiliere, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Non trouvé" });
            syncModuleFilieres(id, filiereIds, (errSync) => {
                if (errSync) return res.status(500).json({ error: errSync.message });
                res.json({ success: true });
            });
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