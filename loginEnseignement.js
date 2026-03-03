// loginEnseignement.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('./db');

router.post('/', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    console.log("=== LOGIN ENSEIGNEMENT ===");
    console.log("Gmail reçu    :", username);
    console.log("Password reçu :", password);

    if (!username || !password) {
        req.session.errorEnseignement = "Veuillez remplir tous les champs.";
        return res.redirect('/loginEnseignement.html');
    }

    connection.query(
        "SELECT * FROM pfe.enseignement WHERE gmail = ?",
        [username],
        async function (err, result) {
            if (err) {
                console.error("Erreur DB :", err);
                req.session.errorEnseignement = "Erreur serveur, réessayez.";
                return res.redirect('/loginEnseignement.html');
            }

            console.log("Résultat DB  :", result);
            console.log("Nb trouvés   :", result.length);

            if (result.length === 0) {
                console.log("❌ Aucun enseignant trouvé avec ce gmail");
                req.session.errorEnseignement = "Email ou mot de passe incorrect.";
                return res.redirect('/loginEnseignement.html');
            }

            const enseignant = result[0];
            console.log("Enseignant   :", enseignant);
            console.log("Password BDD :", enseignant.password);

            let match = false;

            if (enseignant.password && (enseignant.password.startsWith('$2b$') || enseignant.password.startsWith('$2a$'))) {
                console.log("→ Comparaison bcrypt");
                match = await bcrypt.compare(password, enseignant.password);
            } else {
                console.log("→ Comparaison en clair");
                match = (password === enseignant.password);
            }

            console.log("Match        :", match);

            if (match) {
                req.session.enseignant = {
                    id: enseignant.id_enseignement,
                    gmail: enseignant.gmail
                };
                console.log("✅ Connexion réussie");
                return res.redirect('/private/Enseignement/accueilEnseignement.html');
            } else {
                console.log("❌ Mot de passe incorrect");
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

module.exports = router;