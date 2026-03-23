// loginEnseignement.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('./db');

router.post('/', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        req.session.errorEnseignement = "Veuillez remplir tous les champs.";
        return res.redirect('/loginEnseignement.html');
    }

    connection.query(
        "SELECT id_prof, nom, prenom, email, password FROM professeur WHERE email = ?",
        [username],
        async function (err, result) {
            if (err) {
                console.error("Erreur DB :", err);
                req.session.errorEnseignement = "Erreur serveur, réessayez.";
                return res.redirect('/loginEnseignement.html');
            }

            if (result.length === 0) {
                req.session.errorEnseignement = "Email ou mot de passe incorrect.";
                return res.redirect('/loginEnseignement.html');
            }

            const professeur = result[0];

            if (!professeur.password) {
                req.session.errorEnseignement = "Aucun mot de passe n'est configuré pour ce professeur.";
                return res.redirect('/loginEnseignement.html');
            }

            let match = false;

            if (professeur.password.startsWith('$2b$') || professeur.password.startsWith('$2a$')) {
                match = await bcrypt.compare(password, professeur.password);
            } else {
                match = (password === professeur.password);
            }

            if (match) {
                req.session.enseignant = {
                    id: professeur.id_prof,
                    email: professeur.email,
                    nom: professeur.nom,
                    prenom: professeur.prenom
                };
                return res.redirect('/private/Enseignement/accueilEnseignement.html');
            } else {
                req.session.errorEnseignement = "Email ou mot de passe incorrect.";
                return res.redirect('/loginEnseignement.html');
            }
        }
    );
});

router.get('/error', function (req, res) {
    const error = req.session.errorEnseignement || '';
    req.session.errorEnseignement = null;
    res.send(error);
});

router.get('/me', function (req, res) {
    if (!req.session.enseignant) {
        return res.status(401).json({ error: 'Non authentifie' });
    }

    const { id, email, nom, prenom } = req.session.enseignant;

    res.json({
        id,
        email,
        nom,
        prenom,
        fullName: [nom, prenom].filter(Boolean).join(' ').trim() || email
    });
});

module.exports = router;