
const express = require('express');
const salles = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// si tu veux utiliser la DB
const connection = require('./db');

// Stockage multer dans ./views/img/salles
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './views/img/salles';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // nom temporaire, on renomme après insertion dans la DB
        cb(null, 'temp-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Route POST pour ajouter une salle avec image
salles.post('/', upload.single('image_salle'), (req, res) => {
    const { nom_salle, type_salle, capacite, etat, Remarques, batiment } = req.body;

    // 1️⃣ Insérer la salle dans la DB
    connection.execute(
        'INSERT INTO salles (nom_salle, type_salle, capacite, etat, Remarques, batiment) VALUES (?, ?, ?, ?, ?, ?)',
        [nom_salle, type_salle, capacite, etat, Remarques, batiment],
        (err, result) => {
            if (err) return res.status(500).send("Erreur SQL");

            const idSalle = result.insertId;

            // 2️⃣ Si image uploadée, renommer et stocker
            if (req.file) {
                const ext = path.extname(req.file.originalname);
                const newFilename = `img-1-${idSalle}${ext}`;
                const newPath = path.join(req.file.destination, newFilename);

                fs.rename(req.file.path, newPath, (err) => {
                    if (err) console.error(err);

                    // 3️⃣ Mettre à jour la colonne img
                    const imgPath = `/img/salles/${newFilename}`;
                    connection.execute(
                        'UPDATE salles SET img = ? WHERE id_salle = ?',
                        [imgPath, idSalle],
                        (err2) => {
                            if (err2) console.error(err2);
                            res.redirect('/private/salles.html'); // redirection finale
                        }
                    );
                });
            } else {
                res.redirect('/private/salles.html'); // pas d'image
            }
        }
    );
});

salles.post('/supprimer', (req, res) => {
    console.log(req.body);

    connection.execute(
        'DELETE FROM salles WHERE id_salle = ?',
        [req.body.id],
        function(err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Erreur SQL" });
            }

            console.log("Supprimé avec succès");
            res.json({ success: true }); // <-- envoie une réponse au frontend
        }
    );
});


salles.get('/nombreInfo', (req, res) => {

  connection.query("SELECT COUNT(*) AS total FROM salles", function(err, countResult){
    if (err) {
      return res.status(500).json({ error: err });
    }

    const nombreSalles = countResult[0].total;

    connection.query("SELECT  id_salle, nom_salle ,type_salle ,  capacite , etat , Remarques , img, batiment FROM salles", function(err, sallesResult){
      if (err) {
        return res.status(500).json({ error: err });
      }

      res.json({
        nombre_salles: nombreSalles,
        salles: sallesResult
      });
    });


  });
});


 

   module.exports = salles;
