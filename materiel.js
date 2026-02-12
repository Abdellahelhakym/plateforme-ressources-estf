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

 
    connection.execute(
        'INSERT INTO materiel (nom_materiel, type_materiel, quantite, etat, Remarques, salle) VALUES (?, ?, ?, ?, ?, ?)',
        [nom_materiel, type_materiel, quantite, etat, Remarques, salle],
        (err, result) => {
            if (err) return res.status(500).send("Erreur SQL");

            const idMateriel = result.insertId;

          
            if (req.file) {
                const ext = path.extname(req.file.originalname);
                const newFilename = `img-${idMateriel}${ext}`;
                const newPath = path.join(req.file.destination, newFilename);

                fs.rename(req.file.path, newPath, (err) => {
                    if (err) console.error(err);

                   
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

// recuperer les materiel avec sont img
materiel.get('/Info', (req, res) => {

    connection.query("SELECT   id_materiel,nom_materiel, type_materiel, quantite, etat, Remarques, salle, img FROM materiel", function(err, materielResult){
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




 module.exports = materiel;