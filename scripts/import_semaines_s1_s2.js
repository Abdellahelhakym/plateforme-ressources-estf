const connection = require('../db');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

const semaines = [
  // Semestre S1
  { nom: 'S0', debut: '2025-09-15', fin: '2025-09-20', semestre: 'S1' },
  { nom: 'S1', debut: '2025-09-22', fin: '2025-09-27', semestre: 'S1' },
  { nom: 'S2', debut: '2025-09-29', fin: '2025-10-04', semestre: 'S1' },
  { nom: 'S3', debut: '2025-10-06', fin: '2025-10-11', semestre: 'S1' },
  { nom: 'S4', debut: '2025-10-13', fin: '2025-10-18', semestre: 'S1' },
  { nom: 'S5', debut: '2025-10-20', fin: '2025-10-25', semestre: 'S1' },
  { nom: 'S6', debut: '2025-10-27', fin: '2025-11-01', semestre: 'S1' },
  { nom: 'S7', debut: '2025-11-03', fin: '2025-11-08', semestre: 'S1' },
  { nom: 'S8', debut: '2025-11-10', fin: '2025-11-15', semestre: 'S1' },
  { nom: 'S9', debut: '2025-11-17', fin: '2025-11-22', semestre: 'S1' },
  { nom: 'S10', debut: '2025-11-24', fin: '2025-11-29', semestre: 'S1' },
  { nom: 'S11', debut: '2025-12-01', fin: '2025-12-06', semestre: 'S1' },
  { nom: 'S12', debut: '2025-12-08', fin: '2025-12-13', semestre: 'S1' },
  { nom: 'S13', debut: '2025-12-15', fin: '2025-12-20', semestre: 'S1' },
  { nom: 'S14', debut: '2025-12-22', fin: '2025-12-27', semestre: 'S1' },
  { nom: 'S15', debut: '2025-12-29', fin: '2026-01-03', semestre: 'S1' },
  { nom: 'S16', debut: '2026-01-05', fin: '2026-01-10', semestre: 'S1' },

  // Semestre S2
  { nom: 'S17', debut: '2026-02-02', fin: '2026-02-07', semestre: 'S2' },
  { nom: 'S18', debut: '2026-02-09', fin: '2026-02-14', semestre: 'S2' },
  { nom: 'S19', debut: '2026-02-16', fin: '2026-02-21', semestre: 'S2' },
  { nom: 'S20', debut: '2026-02-23', fin: '2026-02-28', semestre: 'S2' },
  { nom: 'S21', debut: '2026-03-02', fin: '2026-03-07', semestre: 'S2' },
  { nom: 'S22', debut: '2026-03-09', fin: '2026-03-14', semestre: 'S2' },
  { nom: 'S23', debut: '2026-03-16', fin: '2026-03-21', semestre: 'S2' },
  { nom: 'S24', debut: '2026-03-23', fin: '2026-03-28', semestre: 'S2' },
  { nom: 'S25', debut: '2026-03-30', fin: '2026-04-04', semestre: 'S2' },
  { nom: 'S26', debut: '2026-04-06', fin: '2026-04-11', semestre: 'S2' },
  { nom: 'S27', debut: '2026-04-13', fin: '2026-04-18', semestre: 'S2' },
  { nom: 'S28', debut: '2026-04-20', fin: '2026-04-25', semestre: 'S2' },
  { nom: 'S29', debut: '2026-04-27', fin: '2026-04-30', semestre: 'S2' },
  { nom: 'S30', debut: '2026-05-11', fin: '2026-05-16', semestre: 'S2' },
  { nom: 'S31', debut: '2026-05-18', fin: '2026-05-23', semestre: 'S2' },
  // Dans l'image 2, la date de fin affichée pour S32 semble être 2025 (incohérence chronologique).
  // On utilise 2026-05-30 pour respecter la continuité du semestre.
  { nom: 'S32', debut: '2026-05-25', fin: '2026-05-30', semestre: 'S2' },
];

function toReferenceAcademicYear(isoDate) {
  const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  const month = parseInt(m[2], 10);
  const year = month >= 9 ? 2000 : 2001;
  return `${year}-${m[2]}-${m[3]}`;
}

async function run() {
  let inserted = 0;
  let updated = 0;

  try {
    const semestres = await query(
      'SELECT id_semestre, nom_semestre FROM semestre WHERE nom_semestre IN (?, ?)',
      ['S1', 'S2']
    );

    const semMap = new Map(semestres.map(s => [String(s.nom_semestre).trim(), s.id_semestre]));

    if (!semMap.get('S1') || !semMap.get('S2')) {
      throw new Error('Semestres S1/S2 introuvables dans la table semestre.');
    }

    for (const w of semaines) {
      const idSemestre = semMap.get(w.semestre);
      const debutRef = toReferenceAcademicYear(w.debut);
      const finRef = toReferenceAcademicYear(w.fin);

      const existing = await query(
        'SELECT id_semaine FROM semaine WHERE nom_semaine = ? AND id_semestre = ? LIMIT 1',
        [w.nom, idSemestre]
      );

      if (existing.length) {
        await query(
          'UPDATE semaine SET date_debut = ?, date_fin = ? WHERE id_semaine = ?',
          [debutRef, finRef, existing[0].id_semaine]
        );
        updated += 1;
      } else {
        await query(
          'INSERT INTO semaine (nom_semaine, date_debut, date_fin, id_semestre) VALUES (?, ?, ?, ?)',
          [w.nom, debutRef, finRef, idSemestre]
        );
        inserted += 1;
      }
    }

    console.log(`[import-semaines] OK. inserted=${inserted}, updated=${updated}, total=${semaines.length}`);
  } finally {
    connection.end();
  }
}

run().catch((err) => {
  console.error('[import-semaines] ECHEC:', err.message);
  process.exitCode = 1;
});
