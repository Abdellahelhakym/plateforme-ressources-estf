// loginEnseignement.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const connection = require('./db');

let cachedGoogleClientId = '';
let cachedGoogleClient = null;

function getGoogleClientId() {
    return String(process.env.GOOGLE_CLIENT_ID || '').trim();
}

function getGoogleOAuthClient(clientId) {
    if (!clientId) return null;
    if (cachedGoogleClient && cachedGoogleClientId === clientId) {
        return cachedGoogleClient;
    }
    cachedGoogleClientId = clientId;
    cachedGoogleClient = new OAuth2Client(clientId);
    return cachedGoogleClient;
}

function setEnseignantSession(req, professeur) {
    req.session.enseignant = {
        id: professeur.id_prof,
        email: professeur.email,
        nom: professeur.nom,
        prenom: professeur.prenom
    };
}

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
                setEnseignantSession(req, professeur);
                return res.redirect('/private/Enseignement/accueilEnseignement.html');
            } else {
                req.session.errorEnseignement = "Email ou mot de passe incorrect.";
                return res.redirect('/loginEnseignement.html');
            }
        }
    );
});

router.get('/google/config', (req, res) => {
    const googleClientId = getGoogleClientId();
    res.json({
        enabled: Boolean(googleClientId),
        clientId: googleClientId,
        reason: googleClientId ? '' : 'GOOGLE_CLIENT_ID manquant côté serveur.'
    });
});

router.post('/google', async (req, res) => {
    const credential = String(req.body.credential || req.body.idToken || '').trim();
    const googleClientId = getGoogleClientId();
    const googleClient = getGoogleOAuthClient(googleClientId);

    if (!googleClientId || !googleClient) {
        return res.status(500).json({ error: 'Connexion Google non configurée sur le serveur.' });
    }

    if (!credential) {
        return res.status(400).json({ error: 'Jeton Google manquant.' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId
        });

        const payload = ticket.getPayload() || {};
        const email = String(payload.email || '').trim().toLowerCase();
        const emailVerified = Boolean(payload.email_verified);

        if (!email || !emailVerified) {
            return res.status(401).json({ error: 'Adresse Gmail non vérifiée par Google.' });
        }

        connection.query(
            'SELECT id_prof, nom, prenom, email FROM professeur WHERE LOWER(email) = ?',
            [email],
            (err, result) => {
                if (err) {
                    console.error('Erreur DB Google login :', err);
                    return res.status(500).json({ error: 'Erreur serveur, réessayez.' });
                }

                if (!result || result.length === 0) {
                    return res.status(403).json({ error: "Ce compte Gmail n'est pas autorisé pour l'espace Enseignement." });
                }

                setEnseignantSession(req, result[0]);
                return res.json({
                    success: true,
                    redirect: '/private/Enseignement/accueilEnseignement.html'
                });
            }
        );
    } catch (err) {
        console.error('Erreur vérification Google token :', err.message);
        return res.status(401).json({ error: 'Connexion Gmail invalide. Veuillez réessayer.' });
    }
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