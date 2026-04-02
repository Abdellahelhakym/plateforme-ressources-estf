const express = require('express');
const materiel = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');


const connection = require('./db');



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './views/img/materiel';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'temp-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// ajouter les materiel avec sont img
materiel.post('/', upload.single('image_materiel'), (req, res) => {
    const { nom_materiel, type_materiel, quantite, etat, Remarques, salle } = req.body;
    console.log(salle);

    connection.execute('SELECT id_salle FROM salles WHERE nom_salle = ? LIMIT 1', [salle], (roomErr, roomRows) => {
        if (roomErr) return res.status(500).send("Erreur SQL");

        const idSalle = roomRows.length ? roomRows[0].id_salle : null;

        connection.execute(
            'INSERT INTO materiel (nom_materiel, type_materiel, quantite, etat, Remarques, salle, id_salle) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nom_materiel, type_materiel, quantite, etat, Remarques, salle, idSalle],
            (err, result) => {
                if (err) return res.status(500).send("Erreur SQL");

                const idMateriel = result.insertId;

                if (req.file) {
                    const ext = path.extname(req.file.originalname);
                    const newFilename = `img-${idMateriel}${ext}`;
                    const newPath = path.join(req.file.destination, newFilename);

                    fs.rename(req.file.path, newPath, (errRename) => {
                        if (errRename) console.error(errRename);

                        const imgPath = `/img/materiel/${newFilename}`;
                        connection.execute(
                            'UPDATE materiel SET img = ? WHERE id_materiel = ?',
                            [imgPath, idMateriel],
                            (err2) => {
                                if (err2) console.error(err2);
                                res.redirect('/private/materiel.html');
                            }
                        );
                    });
                } else {
                    res.redirect('/private/materiel.html');
                }
            }
        );
    });
});

// recuperer les materiel avec sont img
materiel.get('/Info', (req, res) => {

        connection.query(
            `SELECT m.id_materiel,
                            m.nom_materiel,
                            m.type_materiel,
                            m.quantite,
                            m.etat,
                            m.Remarques,
                            COALESCE(s.nom_salle, m.salle) AS salle,
                            m.img
             FROM materiel m
             LEFT JOIN salles s ON s.id_salle = m.id_salle`,
            function(err, materielResult){
      if (err) {
        return res.status(500).json({ error: err });
      }

      res.json({
        materiel: materielResult
      });
        });
  });


  materiel.post('/supprimer', (req, res) => {
    const id = req.body.id;

   
    connection.execute(
        'SELECT img FROM materiel WHERE id_materiel = ?',
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Erreur SQL" });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Matériel introuvable" });
            }

            const imgPath = results[0].img; 
            if (imgPath) {
                const fullImgPath = path.join(__dirname, 'views', imgPath); 

              
                if (fs.existsSync(fullImgPath)) {
                    fs.unlink(fullImgPath, (err) => {
                        if (err) console.error("Erreur suppression image :", err);
                        else console.log("Image supprimée :", fullImgPath);
                    });
                }
            }

           
            connection.execute(
                'DELETE FROM materiel WHERE id_materiel = ?',
                [id],
                (err2, result) => {
                    if (err2) {
                        console.error(err2);
                        return res.status(500).json({ success: false, message: "Erreur SQL" });
                    }

                    console.log("Matériel supprimé avec succès");
                    res.json({ success: true });
                }
            );
        }
    );
});

// modifier les informations d'un matériel (avec image optionnelle)
materiel.put('/:id', upload.single('image_materiel'), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { nom_materiel, type_materiel, quantite, etat, Remarques, salle } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'Identifiant invalide' });
    }

    if (!nom_materiel || !type_materiel || !salle) {
        return res.status(400).json({ success: false, message: 'Nom, type et salle sont obligatoires' });
    }

    const qty = parseInt(quantite, 10);
    if (!Number.isInteger(qty) || qty < 0) {
        return res.status(400).json({ success: false, message: 'Quantité invalide' });
    }

    connection.execute('SELECT id_salle FROM salles WHERE nom_salle = ? LIMIT 1', [salle], (roomErr, roomRows) => {
        if (roomErr) {
            return res.status(500).json({ success: false, message: 'Erreur SQL' });
        }

        const idSalle = roomRows.length ? roomRows[0].id_salle : null;

        const doUpdate = (imgPathToSave) => {
            let sql = 'UPDATE materiel SET nom_materiel = ?, type_materiel = ?, quantite = ?, etat = ?, Remarques = ?, salle = ?, id_salle = ?';
            const params = [nom_materiel, type_materiel, qty, etat || 'Disponible', Remarques || '', salle, idSalle];

            if (imgPathToSave) {
                sql += ', img = ?';
                params.push(imgPathToSave);
            }

            sql += ' WHERE id_materiel = ?';
            params.push(id);

            connection.execute(sql, params, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Erreur SQL' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'Matériel introuvable' });
                }

                res.json({ success: true, message: 'Matériel modifié avec succès' });
            });
        };

        if (!req.file) {
            doUpdate(null);
            return;
        }

        connection.execute('SELECT img FROM materiel WHERE id_materiel = ?', [id], (errOld, oldRows) => {
            if (errOld) {
                return res.status(500).json({ success: false, message: 'Erreur SQL' });
            }

            const oldImgPath = oldRows[0]?.img;
            if (oldImgPath) {
                const cleanOldPath = oldImgPath.replace(/^\//, '');
                const fullOldPath = path.join(__dirname, 'views', cleanOldPath);
                if (fs.existsSync(fullOldPath)) {
                    fs.unlink(fullOldPath, (unlinkErr) => {
                        if (unlinkErr) console.error('Erreur suppression ancienne image :', unlinkErr);
                    });
                }
            }

            const ext = path.extname(req.file.originalname);
            const newFilename = `img-${id}${ext}`;
            const newPath = path.join(req.file.destination, newFilename);

            fs.rename(req.file.path, newPath, (errRename) => {
                if (errRename) {
                    console.error(errRename);
                    return res.status(500).json({ success: false, message: 'Erreur stockage image' });
                }

                doUpdate(`/img/materiel/${newFilename}`);
            });
        });
    });
});




 module.exports = materiel;

 
