const connection = require('./db');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function tableExists(tableName) {
    const rows = await query(
        `SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         LIMIT 1`,
        [tableName]
    );
    return rows.length > 0;
}

async function columnType(tableName, columnName) {
    const rows = await query(
        `SELECT DATA_TYPE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );
    return rows[0]?.DATA_TYPE || null;
}

async function columnExists(tableName, columnName) {
    const rows = await query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );
    return rows.length > 0;
}

async function foreignKeyExists(constraintName) {
    const rows = await query(
        `SELECT 1
         FROM information_schema.REFERENTIAL_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?
         LIMIT 1`,
        [constraintName]
    );
    return rows.length > 0;
}

async function addFkIfMissing({ tableName, constraintName, fkSql }) {
    const exists = await foreignKeyExists(constraintName);
    if (exists) return;
    await query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} ${fkSql}`);
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
    const exists = await columnExists(tableName, columnName);
    if (exists) return;
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
}

async function ensureInnoDB() {
    const tables = [
        'annee',
        'semestre',
        'semaine',
        'creneau',
        'salles',
        'filiere',
        'module_tp',
        'professeur',
        'professeur_filiere',
        'occupation',
        'occupation_semain',
        'materiel'
    ];

    for (const tableName of tables) {
        if (!(await tableExists(tableName))) continue;
        await query(`ALTER TABLE ${tableName} ENGINE=InnoDB`);
    }
}

async function ensureProfesseurFiliereTable() {
    await query(
        `CREATE TABLE IF NOT EXISTS professeur_filiere (
            id_prof INT NOT NULL,
            id_filiere INT NOT NULL,
            PRIMARY KEY (id_prof, id_filiere)
        ) ENGINE=InnoDB`
    );

    await query(
        `INSERT IGNORE INTO professeur_filiere (id_prof, id_filiere)
         SELECT id_prof, id_filiere
         FROM professeur
         WHERE id_filiere IS NOT NULL`
    );
}

async function migrateOccupationWeekColumns() {
    const sDType = await columnType('occupation', 'sD');
    const sFType = await columnType('occupation', 'sF');

    // Legacy schema stores week IDs as VARCHAR; convert once to INT for FK support.
    if (sDType !== 'int' || sFType !== 'int') {
        await addColumnIfMissing('occupation', 'sD_int', 'INT NULL');
        await addColumnIfMissing('occupation', 'sF_int', 'INT NULL');

        await query(`
            UPDATE occupation
            SET sD_int = CASE
                WHEN sD REGEXP '^[0-9]+$' THEN CAST(sD AS UNSIGNED)
                ELSE NULL
            END,
            sF_int = CASE
                WHEN sF REGEXP '^[0-9]+$' THEN CAST(sF AS UNSIGNED)
                ELSE NULL
            END
        `);

        await query(`
            UPDATE occupation o
            LEFT JOIN semaine wsD ON wsD.nom_semaine = o.sD
            LEFT JOIN semaine wsF ON wsF.nom_semaine = o.sF
            SET o.sD_int = COALESCE(o.sD_int, wsD.id_semaine),
                o.sF_int = COALESCE(o.sF_int, wsF.id_semaine)
        `);

        await query('ALTER TABLE occupation DROP COLUMN sD, DROP COLUMN sF');
        await query('ALTER TABLE occupation CHANGE COLUMN sD_int sD INT NULL, CHANGE COLUMN sF_int sF INT NULL');
    }
}

async function ensureMaterielSalleRelation() {
    await addColumnIfMissing('materiel', 'id_salle', 'INT NULL');

    await query(`
        UPDATE materiel m
        LEFT JOIN salles s ON s.nom_salle = m.salle
        SET m.id_salle = s.id_salle
        WHERE m.id_salle IS NULL
    `);
}

async function cleanupOrphans() {
    await query('DELETE os FROM occupation_semain os LEFT JOIN occupation o ON o.id_occupation = os.id_occupation WHERE o.id_occupation IS NULL');
    await query('DELETE os FROM occupation_semain os LEFT JOIN semaine s ON s.id_semaine = os.id_semain WHERE s.id_semaine IS NULL');

    await query('DELETE pf FROM professeur_filiere pf LEFT JOIN professeur p ON p.id_prof = pf.id_prof WHERE p.id_prof IS NULL');
    await query('DELETE pf FROM professeur_filiere pf LEFT JOIN filiere f ON f.id_filiere = pf.id_filiere WHERE f.id_filiere IS NULL');

    await query('UPDATE professeur p LEFT JOIN filiere f ON f.id_filiere = p.id_filiere SET p.id_filiere = NULL WHERE p.id_filiere IS NOT NULL AND f.id_filiere IS NULL');

    await query('DELETE m FROM module_tp m LEFT JOIN filiere f ON f.id_filiere = m.id_filiere WHERE f.id_filiere IS NULL');

    await query('DELETE w FROM semaine w LEFT JOIN semestre s ON s.id_semestre = w.id_semestre WHERE w.id_semestre IS NOT NULL AND s.id_semestre IS NULL');

    await query(`
        DELETE o FROM occupation o
        LEFT JOIN annee a ON a.id_annee = o.id_annee
        LEFT JOIN semestre se ON se.id_semestre = o.id_semestre
        LEFT JOIN creneau c ON c.id_creneau = o.id_creneau
        LEFT JOIN salles sa ON sa.id_salle = o.id_salles
        LEFT JOIN filiere f ON f.id_filiere = o.id_filier
        LEFT JOIN module_tp m ON m.id_module = o.id_modul
        LEFT JOIN professeur p ON p.id_prof = o.id_prof
        LEFT JOIN semaine sd ON sd.id_semaine = o.sD
        LEFT JOIN semaine sf ON sf.id_semaine = o.sF
        WHERE a.id_annee IS NULL
           OR se.id_semestre IS NULL
           OR c.id_creneau IS NULL
           OR sa.id_salle IS NULL
           OR f.id_filiere IS NULL
           OR m.id_module IS NULL
           OR p.id_prof IS NULL
           OR (o.sD IS NOT NULL AND sd.id_semaine IS NULL)
           OR (o.sF IS NOT NULL AND sf.id_semaine IS NULL)
    `);

    await query('UPDATE materiel m LEFT JOIN salles s ON s.id_salle = m.id_salle SET m.id_salle = NULL WHERE m.id_salle IS NOT NULL AND s.id_salle IS NULL');
}

async function addForeignKeys() {
    await addFkIfMissing({
        tableName: 'semaine',
        constraintName: 'fk_semaine_semestre',
        fkSql: 'FOREIGN KEY (id_semestre) REFERENCES semestre(id_semestre) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'module_tp',
        constraintName: 'fk_module_filiere',
        fkSql: 'FOREIGN KEY (id_filiere) REFERENCES filiere(id_filiere) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'professeur',
        constraintName: 'fk_professeur_filiere',
        fkSql: 'FOREIGN KEY (id_filiere) REFERENCES filiere(id_filiere) ON DELETE SET NULL ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'professeur_filiere',
        constraintName: 'fk_professeur_filiere_prof',
        fkSql: 'FOREIGN KEY (id_prof) REFERENCES professeur(id_prof) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'professeur_filiere',
        constraintName: 'fk_professeur_filiere_fil',
        fkSql: 'FOREIGN KEY (id_filiere) REFERENCES filiere(id_filiere) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_annee',
        fkSql: 'FOREIGN KEY (id_annee) REFERENCES annee(id_annee) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_semestre',
        fkSql: 'FOREIGN KEY (id_semestre) REFERENCES semestre(id_semestre) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_creneau',
        fkSql: 'FOREIGN KEY (id_creneau) REFERENCES creneau(id_creneau) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_salle',
        fkSql: 'FOREIGN KEY (id_salles) REFERENCES salles(id_salle) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_filiere',
        fkSql: 'FOREIGN KEY (id_filier) REFERENCES filiere(id_filiere) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_module',
        fkSql: 'FOREIGN KEY (id_modul) REFERENCES module_tp(id_module) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_prof',
        fkSql: 'FOREIGN KEY (id_prof) REFERENCES professeur(id_prof) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_semaine_debut',
        fkSql: 'FOREIGN KEY (sD) REFERENCES semaine(id_semaine) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation',
        constraintName: 'fk_occupation_semaine_fin',
        fkSql: 'FOREIGN KEY (sF) REFERENCES semaine(id_semaine) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation_semain',
        constraintName: 'fk_occ_semain_occ',
        fkSql: 'FOREIGN KEY (id_occupation) REFERENCES occupation(id_occupation) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'occupation_semain',
        constraintName: 'fk_occ_semain_semaine',
        fkSql: 'FOREIGN KEY (id_semain) REFERENCES semaine(id_semaine) ON DELETE CASCADE ON UPDATE CASCADE'
    });

    await addFkIfMissing({
        tableName: 'materiel',
        constraintName: 'fk_materiel_salle',
        fkSql: 'FOREIGN KEY (id_salle) REFERENCES salles(id_salle) ON DELETE CASCADE ON UPDATE CASCADE'
    });
}

async function runSchemaIntegrityMigrations() {
    try {
        await ensureInnoDB();
        await ensureProfesseurFiliereTable();
        await migrateOccupationWeekColumns();
        await ensureMaterielSalleRelation();
        await cleanupOrphans();
        await addForeignKeys();
        console.log('[schema] Integrite referentielle verifiee');
    } catch (err) {
        console.error('[schema] Echec migration integrite :', err.message);
    }
}

module.exports = {
    runSchemaIntegrityMigrations
};
