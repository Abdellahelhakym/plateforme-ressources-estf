// login.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const connection = require('./db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /login  — Vérification identifiants avec mot de passe haché
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        req.session.error = "Veuillez remplir tous les champs.";
        return res.redirect('/login.html');
    }

    // On récupère l'admin par son nom d'utilisateur uniquement
    connection.query(
        "SELECT * FROM admin WHERE user = ?",
        [username],
        async function (err, result) {
            if (err) {
                console.error("Erreur DB :", err);
                req.session.error = "Erreur serveur, réessayez.";
                return res.redirect('/login.html');
            }

            if (result.length === 0) {
                // Utilisateur introuvable
                req.session.error = "user ou mot de passe incorrect.";
                return res.redirect('/login.html');
            }

            const admin = result[0];

            // Comparaison du mot de passe saisi avec le hash stocké en BDD
            const match = await bcrypt.compare(password, admin.password);

            if (match) {
                req.session.user = username;
                return res.redirect('/private/accueil.html');
            } else {
                req.session.error = "Nom ou mot de passe incorrect.";
                return res.redirect('/login.html');
            }
        }
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /login/error  — Renvoie le message d'erreur de session (usage front)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/error', function (req, res) {
    const error = req.session.error || '';
    req.session.error = null;
    res.send(error);
});

module.exports = router;