document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/loginEnseignement/me');

        if (!response.ok) {
            return;
        }

        const professeur = await response.json();
        const displayName = professeur.fullName
            || [professeur.nom, professeur.prenom].filter(Boolean).join(' ').trim()
            || professeur.email
            || 'Professeur';

        document.querySelectorAll('.admin-text').forEach((element) => {
            element.textContent = displayName;
        });
    } catch (error) {
        console.error('Impossible de charger le professeur connecte :', error);
    }
});