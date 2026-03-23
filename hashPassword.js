// hashPassword.js
// ─────────────────────────────────────────────────────────────────────────────
// Script utilitaire pour hacher le mot de passe d'un professeur existant
// en base de données.
//
// Usage :  node hashPassword.js professeur@exemple.com nouveauMotDePasse
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt     = require('bcrypt');
const connection = require('./db');

const email = process.argv[2];
const plainPassword = process.argv[3];
const SALT_ROUNDS = 10;

async function hashAndUpdate() {
    if (!email || !plainPassword) {
        console.error('Usage : node hashPassword.js professeur@exemple.com nouveauMotDePasse');
        connection.end();
        return;
    }

    try {
        const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
        console.log('✅ Hash généré :', hash);

        connection.query(
            'UPDATE professeur SET password = ? WHERE email = ?',
            [hash, email],
            (err, result) => {
                if (err) {
                    console.error('❌ Erreur lors de la mise à jour :', err);
                } else {
                    console.log(`✅ ${result.affectedRows} compte(s) professeur mis à jour.`);
                }
                connection.end();
            }
        );
    } catch (e) {
        console.error('❌ Erreur :', e);
        connection.end();
    }
}

hashAndUpdate();
