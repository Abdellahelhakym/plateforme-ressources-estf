// hashPassword.js
// ─────────────────────────────────────────────────────────────────────────────
// Script à exécuter UNE SEULE FOIS pour hacher le mot de passe existant
// en base de données.
//
// Usage :  node hashPassword.js
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt     = require('bcrypt');
const connection = require('./db');

const PLAIN_PASSWORD = '1234';   // ← mot de passe actuel en clair
const SALT_ROUNDS    = 10;       // coût du hachage (recommandé : 10-12)

async function hashAndUpdate() {
    try {
        // 1. Générer le hash
        const hash = await bcrypt.hash(PLAIN_PASSWORD, SALT_ROUNDS);
        console.log('✅ Hash généré :', hash);

        // 2. Mettre à jour TOUS les admins dont le mot de passe vaut encore '1234'
        //    → Adaptez la clause WHERE si nécessaire
        connection.query(
            "UPDATE Enseignement SET password = ? WHERE password = ?",
            [hash, PLAIN_PASSWORD],
            (err, result) => {
                if (err) {
                    console.error('❌ Erreur lors de la mise à jour :', err);
                } else {
                    console.log(`✅ ${result.affectedRows} compte(s) mis à jour avec le mot de passe haché.`);
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
