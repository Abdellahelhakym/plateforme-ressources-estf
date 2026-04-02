const connection = require('../db');

const sql = `
UPDATE semaine
SET
  date_debut = STR_TO_DATE(
    CONCAT(
      CASE WHEN MONTH(date_debut) >= 9 THEN 2000 ELSE 2001 END,
      '-', LPAD(MONTH(date_debut), 2, '0'),
      '-', LPAD(DAY(date_debut), 2, '0')
    ),
    '%Y-%m-%d'
  ),
  date_fin = STR_TO_DATE(
    CONCAT(
      CASE WHEN MONTH(date_fin) >= 9 THEN 2000 ELSE 2001 END,
      '-', LPAD(MONTH(date_fin), 2, '0'),
      '-', LPAD(DAY(date_fin), 2, '0')
    ),
    '%Y-%m-%d'
  )
`;

connection.query(sql, (err, result) => {
  if (err) {
    console.error('[normalize-semaines] ECHEC:', err.message);
    connection.end();
    process.exit(1);
    return;
  }

  console.log(`[normalize-semaines] OK. affectedRows=${result.affectedRows}`);
  connection.end();
});
