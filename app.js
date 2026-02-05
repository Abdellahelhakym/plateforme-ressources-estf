const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));


//route 
const loginRouter = require('./login'); 
const salles = require('./salles');



app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: false
}));

// Middleware pour vérifier si connecté
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
}



// Routes
app.use('/login', loginRouter);

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

//logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login.html');
    });
});


// Routes salles 
app.use('/ajouterSalles', salles);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
