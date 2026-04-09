# Projet PFE - Gestion des Salles, Ressources et Occupations

Application web Node.js/Express pour gerer l'occupation des salles, les ressources et le materiel, avec deux espaces de connexion (Administration et Enseignement).

## 1) Presentation du projet

### Nom du projet
Plateforme de gestion des ressources pédagogiques
du Département Informatique - ESTF


### Objectif
Ce projet permet de centraliser la planification et la consultation des occupations (seances, semaines, creneaux), ainsi que la gestion des salles, du materiel et des ressources academiques.

### Fonctionnalites principales
- Authentification Admin (session serveur).
- Authentification Enseignant (email/mot de passe) + option Google Sign-In.
- Gestion des salles.
- Gestion du materiel.
- Gestion des ressources.
- Configuration temporelle (annees, semestres, semaines, creneaux selon vos donnees).
- Gestion des occupations.
- Consultation publique et tableaux de bord.
- Verification/migration automatique d'integrite du schema SQL au demarrage.

## 2) Installation

### Prerequis
- Node.js (version recente recommandee, ex: 18+).
- npm.
- Un serveur local installe (WAMP ou XAMPP).
- MySQL (ou MariaDB compatible) avec une base `pfe`.

### Etapes
1. Cloner le projet et se placer dans le dossier.
2. Installer les dependances:

```bash
npm install
```

3. Configurer l'environnement:
   - Copier `.env.example` vers `.env`.
   - Sous Windows (PowerShell): `Copy-Item .env.example .env`
   - Sous Linux/macOS: `cp .env.example .env`
   - Renseigner au minimum `GOOGLE_CLIENT_ID` si vous utilisez la connexion Google Enseignement.
   - `GOOGLE_CLIENT_SECRET` et `GOOGLE_REDIRECT_URI` peuvent etre gardes pour une evolution future (ils ne sont pas obligatoires dans le flux actuel).
   - En production, definir aussi `SESSION_SECRET`.

4. Configurer la connexion MySQL dans `db.js` (host, user, password, database).
5. Importer la base de donnees depuis le fichier SQL du projet.

#### Import MySQL (pas a pas)

1. Ouvrir un terminal dans le dossier du projet.
2. Verifier que MySQL est disponible:

```bash
mysql --version
```

3. Creer la base `pfe` (si elle n'existe pas):

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pfe;"
```

4. Importer le fichier SQL du dossier `base de donner`:

```bash
mysql -u root -p pfe < "base de donner/pfe .sql"
```

5. Verifier que l'import a fonctionne:

```bash
mysql -u root -p -e "USE pfe; SHOW TABLES;"
```

Si la commande `mysql` n'est pas reconnue sur Windows, utilisez le chemin complet de l'executable MySQL (exemple):

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p pfe < "base de donner/pfe .sql"
```

Important:
- Si vous utilisez cette base `pfe` du dossier `base de donner`, les semaines sont deja remplies.
- Dans ce cas, aucun script manuel supplementaire n'est necessaire.

Alternative (phpMyAdmin):
- Creer la base `pfe`.
- Ouvrir l'onglet Importer.
- Selectionner le fichier `base de donner/pfe .sql`.
- Lancer l'import.

6. Lancer le serveur:

```bash
node app.js
```

7. Ouvrir le navigateur sur:

```text
http://localhost:3000
```

### Configuration de l'authentification Google (Enseignement)

Le projet utilise Google Identity Services pour connecter un enseignant avec son compte Gmail sur la page `/loginEnseignement.html`.

1. Ouvrir Google Cloud Console et creer (ou choisir) un projet.
2. Configurer l'ecran de consentement OAuth.
3. Creer un identifiant OAuth 2.0 de type "Application Web".
4. Dans "Authorized JavaScript origins", ajouter au minimum:
   - `http://localhost:3000`
5. Copier le Client ID Google et le placer dans `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

6. Redemarrer le serveur (`node app.js`) apres la modification du `.env`.

Important:
- Le flux actuel verifie un `id_token` Google cote serveur via `POST /loginEnseignement/google`.
- La route de callback OAuth classique n'est pas utilisee dans l'implementation actuelle.
- L'adresse Gmail choisie doit exister dans la table `professeur` (colonne `email`), sinon l'acces est refuse.

## 3) Utilisation

### Role de chaque page

#### Espace public
- `/index.html` : page d'entree principale du projet.
- `/accueilPublic.html` : page d'accueil publique pour consulter rapidement la plateforme.
- `/ConsultationPublic.html` : consultation publique des occupations/plannings.
- `/login.html` : page de connexion Admin.
- `/loginEnseignement.html` : page de connexion Enseignant.

#### Espace Admin (apres connexion)
- `/private/accueil.html` : accueil de l'administration.
- `/private/dashboard.html` : vue globale (indicateurs/tableau de bord).
- `/private/salles.html` : gestion et consultation des salles.
- `/private/ajouterSalles.html` : ajout d'une salle.
- `/private/materiel.html` : gestion et consultation du materiel.
- `/private/ajouterMateriel.html` : ajout de materiel.
- `/private/ressource.html` : gestion des ressources.
- `/private/ressourceAcademiques.html` : ressources academiques.
- `/private/occupation.html` : gestion des occupations (affectations/planning).
- `/private/configurationTemporelle.html` : configuration des annees/semestres/semaines/creneaux.
- `/private/consultation.html` : consultation detaillee des donnees.

#### Espace Enseignement (apres connexion)
- `/private/Enseignement/accueilEnseignement.html` : accueil enseignant.
- `/private/Enseignement/dashboardEnseignement.html` : vue de suivi enseignant.
- `/private/Enseignement/sallesEnseignement.html` : consultation des salles cote enseignant.
- `/private/Enseignement/materielEnseignement.html` : consultation du materiel cote enseignant.
- `/private/Enseignement/ressourceEnseignement.html` : ressources cote enseignant.
- `/private/Enseignement/ressourceAcademiquesEnseignement.html` : ressources academiques cote enseignant.
- `/private/Enseignement/configurationTemporelleEnseignement.html` : vue temporelle cote enseignant.
- `/private/Enseignement/ConsultationEnseignement.html` : consultation des occupations pour l'espace enseignant.

### Comment utiliser la plateforme
1. Ouvrir `http://localhost:3000`.
2. Pour un visiteur: utiliser les pages publiques (`/index.html`, `/accueilPublic.html`, `/ConsultationPublic.html`).
3. Pour un administrateur: se connecter via `/login.html`, puis gerer les salles, le materiel, les ressources et les occupations depuis les pages `/private/...`.
4. Pour un enseignant: se connecter via `/loginEnseignement.html`, puis consulter les informations depuis les pages `/private/Enseignement/...`.
5. Se deconnecter via `/logout` (admin) ou `/logoutEnseignement` (enseignant).

### Comment utiliser la connexion Google (Enseignement)
1. Aller sur `/loginEnseignement.html`.
2. Cliquer sur le bouton Google affiche sous le formulaire de connexion.
3. Choisir le compte Gmail enseignant.
4. Si le compte est autorise (present dans `professeur.email`), vous etes redirige vers `/private/Enseignement/accueilEnseignement.html`.

Erreurs possibles:
- Message "Connexion Gmail indisponible": `GOOGLE_CLIENT_ID` manquant dans `.env` ou serveur non redemarre.
- Message "Ce compte Gmail n'est pas autorise": email absent de la table `professeur`.
- Message "Connexion Gmail invalide": mauvaise configuration Google Cloud (Client ID / origine JavaScript).

### Acces Admin (par defaut)

```text
user: admin
password: 1234
```

### Comptes Enseignement

- Les comptes Enseignement ou professeur sont crees par l'administrateur avec un email  et un mot de passe.
- L'administrateur peut modifier le mot de passe d'un compte Enseignement.
- Dans la base `pfe` fournie, le mot de passe par defaut des comptes Enseignement est: `1234`.

## 4) Structure du projet

### Organisation des dossiers
```text
Project PFE/
|- app.js
|- db.js
|- login.js
|- loginEnseignement.js
|- salles.js
|- materiel.js
|- ressource.js
|- occupation.js
|- consultation.js
|- dashboard.js
|- configurationTemporelle.js
|- schemaIntegrity.js
|- hashPassword.js
|- scripts/
|- views/                  # pages publiques
`- Private/                # pages privees admin + enseignement
```

### Technologies utilisees
- Back-end: Node.js, Express.
- Base de donnees: MySQL (`mysql2`).
- Authentification et securite: `express-session`, `bcrypt`, Google OAuth (`google-auth-library`).
- Upload fichiers: `multer`.
- Front-end: HTML, CSS, JavaScript vanilla.

## 5) Collaboration

### Regles de contribution
1. Creer une branche par fonctionnalite/correction.
2. Faire des commits clairs et petits.
3. Tester localement avant de proposer une fusion.
4. Ouvrir une Pull Request avec:
   - objectif,
   - changements effectues,
   - captures d'ecran (si interface modifiee),
   - etapes de test.

### Conventions de code
- Garder une structure simple: 1 module Express par domaine (`salles.js`, `materiel.js`, etc.).
- Nommer clairement les routes et les fichiers.
- Eviter les changements non lies a la tache en cours.
- Ajouter des commentaires uniquement si la logique est complexe.

### Signaler un bug ou proposer une amelioration
- Ouvrir une issue avec:
  - contexte,
  - comportement observe,
  - comportement attendu,
  - etapes pour reproduire,
  - captures/logs utiles.

---

## Notes
- Au demarrage, `app.js` appelle `runSchemaIntegrityMigrations()` pour verifier/corriger certains points d'integrite referentielle.
- En environnement de production, definir `SESSION_SECRET` est obligatoire.