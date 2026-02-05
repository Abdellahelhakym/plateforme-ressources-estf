
const express = require('express');
const salles = express.Router();

// si tu veux utiliser la DB
const connection = require('./db');

salles.post('/', (req, res) => {
    console.log(req.body);

    connection.execute('INSERT INTO salles(nom_salle , type_salle , capacite , etat , Remarques , batiment ) VALUES(?,?,?,?,?,?)', [req.body.nom_salle , req.body.type_salle , req.body.capacite, req.body.etat,req.body.Remarques,req.body.batiment] ,function(err , result){
        if(!err){
                res.redirect('/private/salles.html');
        }
    });

    
});

salles.get('/nombre', (req, res) => {
    

  connection.query("SELECT COUNT(*) AS total FROM salles", (err, result) => {
    if (err) {
       
        res.status(500).json({ error: err });
        return;
    }

    
        const nombreSalles = result[0].total;
        res.json({ nombre_salles: nombreSalles });
});


    
});

   module.exports = salles;
