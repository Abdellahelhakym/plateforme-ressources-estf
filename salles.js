const express = require('express');
const salles  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const connection = require('./db');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG MULTER (identique à l'original)
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './views/img/salles';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'temp-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ─────────────────────────────────────────────────────────────────────────────
// POST /Salles — ajouter une salle (identique à l'original)
// ─────────────────────────────────────────────────────────────────────────────
salles.post('/', upload.single('image_salle'), (req, res) => {
    const { nom_salle, type_salle, capacite, etat, Remarques, batiment } = req.body;

    connection.execute(
        'INSERT INTO salles (nom_salle, type_salle, capacite, etat, Remarques, batiment) VALUES (?, ?, ?, ?, ?, ?)',
        [nom_salle, type_salle, capacite, etat, Remarques, batiment],
        (err, result) => {
            if (err) return res.status(500).send("Erreur SQL");

            const idSalle = result.insertId;

            if (req.file) {
                const ext         = path.extname(req.file.originalname);
                const newFilename = `img-1-${idSalle}${ext}`;
                const newPath     = path.join(req.file.destination, newFilename);

                fs.rename(req.file.path, newPath, (err) => {
                    if (err) console.error(err);
                    const imgPath = `/img/salles/${newFilename}`;
                    connection.execute(
                        'UPDATE salles SET img = ? WHERE id_salle = ?',
                        [imgPath, idSalle],
                        (err2) => {
                            if (err2) console.error(err2);
                            res.redirect('/private/salles.html');
                        }
                    );
                });
            } else {
                res.redirect('/private/salles.html');
            }
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /Salles/supprimer — supprimer une salle (identique à l'original)
// ─────────────────────────────────────────────────────────────────────────────
salles.post('/supprimer', (req, res) => {
    const id = req.body.id;

    connection.execute('SELECT img FROM salles WHERE id_salle = ?', [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erreur SQL" });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Salle introuvable" });
        }

        const imgPath     = results[0].img;
        const fullImgPath = path.join(__dirname, 'views', imgPath || '');

        if (imgPath && fs.existsSync(fullImgPath)) {
            fs.unlink(fullImgPath, (err) => {
                if (err) console.error("Erreur suppression image :", err);
                else     console.log("Image supprimée :", fullImgPath);
            });
        }

        connection.execute('DELETE FROM salles WHERE id_salle = ?', [id], (err2) => {
            if (err2) {
                console.error(err2);
                return res.status(500).json({ success: false, message: "Erreur SQL" });
            }
            console.log("Salle supprimée avec succès");
            res.json({ success: true });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /Salles/Info — récupérer toutes les salles (identique à l'original)
// ─────────────────────────────────────────────────────────────────────────────
salles.get('/Info', (req, res) => {
    connection.query(
        'SELECT id_salle, nom_salle, type_salle, capacite, etat, Remarques, img, batiment FROM salles',
        (err, sallesResult) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ salles: sallesResult });
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /Salles/materiel/:nom_salle  ← NOUVEAU
// Récupérer tout le matériel d'une salle précise
// ─────────────────────────────────────────────────────────────────────────────
salles.get('/materiel/:nom_salle', (req, res) => {
    const nom_salle = req.params.nom_salle;

    connection.query(
        `SELECT id_materiel, nom_materiel, type_materiel, etat, quantite, Remarques, img
         FROM materiel
         WHERE salle = ?
         ORDER BY type_materiel, nom_materiel`,
        [nom_salle],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ materiel: rows });
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /Salles/:id  ← NOUVEAU
// Récupérer une salle par son ID (pour pré-remplir le formulaire modifier)
// ─────────────────────────────────────────────────────────────────────────────
salles.get('/:id', (req, res) => {
    connection.execute(
        'SELECT id_salle, nom_salle, type_salle, capacite, etat, Remarques, img, batiment FROM salles WHERE id_salle = ?',
        [req.params.id],
        (err, rows) => {
            if (err)             return res.status(500).json({ error: err.message });
            if (!rows.length)    return res.status(404).json({ error: "Salle introuvable" });
            res.json(rows[0]);
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /Salles/:id  ← NOUVEAU
// Modifier les données d'une salle (avec ou sans nouvelle image)
// ─────────────────────────────────────────────────────────────────────────────
salles.put('/:id', upload.single('image_salle'), (req, res) => {
    const id = req.params.id;
    const { nom_salle, type_salle, capacite, etat, Remarques, batiment } = req.body;

    // Fonction finale d'UPDATE
    const doUpdate = (newImgPath) => {
        let sql, params;

        if (newImgPath) {
            sql    = 'UPDATE salles SET nom_salle=?, type_salle=?, capacite=?, etat=?, Remarques=?, batiment=?, img=? WHERE id_salle=?';
            params = [nom_salle, type_salle, capacite, etat, Remarques, batiment, newImgPath, id];
        } else {
            sql    = 'UPDATE salles SET nom_salle=?, type_salle=?, capacite=?, etat=?, Remarques=?, batiment=? WHERE id_salle=?';
            params = [nom_salle, type_salle, capacite, etat, Remarques, batiment, id];
        }

        connection.execute(sql, params, (err, result) => {
            if (err) {
                console.error("Erreur SQL modifier :", err);
                return res.status(500).json({ success: false, message: "Erreur SQL : " + err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Salle introuvable" });
            }
            // Retourner le nouveau chemin image si changé (pour mise à jour côté client)
            res.json({ success: true, message: "Salle modifiée avec succès", img: newImgPath || null });
        });
    };

    if (req.file) {
        // Nouvelle image fournie → supprimer l'ancienne puis renommer
        connection.execute('SELECT img FROM salles WHERE id_salle = ?', [id], (err, rows) => {
            // Supprimer ancienne image si elle existe
            if (!err && rows.length > 0 && rows[0].img) {
                const oldPath = path.join(__dirname, 'views', rows[0].img);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (e) => { if (e) console.error("Erreur suppression ancienne image :", e); });
                }
            }

            // Renommer le fichier temp en img-1-{id}.ext
            const ext         = path.extname(req.file.originalname);
            const newFilename = `img-1-${id}${ext}`;
            const newPath     = path.join(req.file.destination, newFilename);

            fs.rename(req.file.path, newPath, (renErr) => {
                if (renErr) console.error("Erreur rename :", renErr);
                doUpdate(`/img/salles/${newFilename}`);
            });
        });
    } else {
        // Pas de nouvelle image → garder l'ancienne
        doUpdate(null);
    }
});

module.exports = salles;
