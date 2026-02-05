// login.js
const express = require('express');
const router = express.Router();

// base de donner 
const connection = require('./db');

router.post('/', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

   

    connection.query("SELECT * FROM admin WHERE user=? AND password=? ",[username , password] , function(err , result){
        console.log(result);
        if(result.length >= 1) {
        req.session.user = username;
        res.redirect('/private/accueil.html');
    } else {
     req.session.error = "Username ou mot de passe incorrect";
        res.redirect('/login.html');
    }
    })

    
});

router.get('/error',function(req , res){
    const error = req.session.error || '';
    req.session.error =null;
    res.send(error);
});




module.exports = router;
