const mysql = require('mysql2');


const connection = mysql.createConnection({
 host: 'localhost',     
  user: 'root',         
  password: '',
  database: 'pfe'
})

connection.connect(function (err){
  if (err) {
    console.error('Erreur de connexion :', err);
  } else {
    console.log('Connecté à MySQL!');
  }
});

module.exports = connection;