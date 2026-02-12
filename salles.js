
const express = require('express');
const salles = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');


const connection = require('./db');


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

// ajouter salles avec sont img
salles.post('/', upload.single('image_salle'), (req, res) => {
    const { nom_salle, type_salle, capacite, etat, Remarques, batiment } = req.body;

 
    connection.execute(
        'INSERT INTO salles (nom_salle, type_salle, capacite, etat, Remarques, batiment) VALUES (?, ?, ?, ?, ?, ?)',
        [nom_salle, type_salle, capacite, etat, Remarques, batiment],
        (err, result) => {
            if (err) return res.status(500).send("Erreur SQL");

            const idSalle = result.insertId;

           
            if (req.file) {
                const ext = path.extname(req.file.originalname);
                const newFilename = `img-1-${idSalle}${ext}`;
                const newPath = path.join(req.file.destination, newFilename);

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

// supprimer salles avec sont img

salles.post('/supprimer', (req, res) => {
    const id = req.body.id;

   
    connection.execute(
        'SELECT img FROM salles WHERE id_salle = ?',
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Erreur SQL" });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Salle introuvable" });
            }

            const imgPath = results[0].img; 
            const fullImgPath = path.join(__dirname, 'views', imgPath);

          
            if (fs.existsSync(fullImgPath)) {
                fs.unlink(fullImgPath, (err) => {
                    if (err) console.error("Erreur suppression image :", err);
                    else console.log("Image supprimée :", fullImgPath);
                });
            }

         
            connection.execute(
                'DELETE FROM salles WHERE id_salle = ?',
                [id],
                (err2, result) => {
                    if (err2) {
                        console.error(err2);
                        return res.status(500).json({ success: false, message: "Erreur SQL" });
                    }

                    console.log("Salle supprimée avec succès");
                    res.json({ success: true });
                }
            );
        }
    );
});

// recuperer les salles 
salles.get('/Info', (req, res) => {

    connection.query("SELECT  id_salle, nom_salle ,type_salle ,  capacite , etat , Remarques , img, batiment FROM salles", function(err, sallesResult){
      if (err) {
        return res.status(500).json({ error: err });
      }

      res.json({
        
        salles: sallesResult
      });
    });
  });



 

   module.exports = salles;
