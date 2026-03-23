const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

// Routes
const loginRouter = require('./login');
const loginEnseignementRouter = require('./loginEnseignement'); 
const salles = require('./salles');
const materiel = require('./materiel');
const ressource = require('./ressource');
const config = require('./configurationTemporelle');
const occupation = require('./occupation');
const consultation = require('./consultation');
const dashboard = require('./dashboard');
const { runSchemaIntegrityMigrations } = require('./schemaIntegrity');

app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: false
}));

runSchemaIntegrityMigrations();

// ─── Middleware Admin ────────────────────────────────────────────────────────
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

// ─── Middleware Enseignant ───────────────────────────────────────────────────
function isEnseignantLoggedIn(req, res, next) {
    if (req.session.enseignant) {
        next();
    } else {
        res.redirect('/loginEnseignement.html');
    }
}

// ─── Routes Auth ─────────────────────────────────────────────────────────────
app.use('/login', loginRouter);
app.use('/loginEnseignement', loginEnseignementRouter); // ← NOUVEAU

// ─── Routes Private Admin ─────────────────────────────────────────────────────
app.get('/private/:page', isLoggedIn, (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, 'Private', page));
});

app.get('/private/css/:file', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'css', req.params.file));
});

app.get('/private/img/:file', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'img', req.params.file));
});

app.get('/private/js/:file', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'js', req.params.file));
});

// ─── Routes Private Enseignement ─────────────────────────────────────────────
app.get('/private/Enseignement/:page', isEnseignantLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'Enseignement', req.params.page));
});

app.get('/private/Enseignement/css/:file', isEnseignantLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'Enseignement', 'css', req.params.file));
});

app.get('/private/Enseignement/js/:file', isEnseignantLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'Enseignement', 'js', req.params.file));
});

app.get('/private/Enseignement/img/:file', isEnseignantLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'Private', 'Enseignement', 'img', req.params.file));
});

// ─── Logout Admin ─────────────────────────────────────────────────────────────
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});

// ─── Logout Enseignant ────────────────────────────────────────────────────────
app.get('/logoutEnseignement', (req, res) => {
    req.session.enseignant = null;
    res.redirect('/loginEnseignement.html');
});

// ─── Autres routes ────────────────────────────────────────────────────────────
app.use('/Salles', salles);
app.use('/materiel', materiel);
app.use('/ressource', ressource);
app.use('/config', config);
app.use('/occupation', occupation);
app.use('/consultation', consultation);
app.use('/dashboard', dashboard);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));