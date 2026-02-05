
let nombreSalles;

async function getNombreSalles() {
    try{
           const response = await fetch('/ajouterSalles/nombre', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

         const data = await response.json();

        
         nombreSalles = data.nombre_salles;

         console.log(nombreSalles);
         afficherSalles();
         

    }catch (err) {
        console.error("Erreur lors du fetch :", err);
        return 0; // valeur par défaut en cas d'erreur
    }
}

function afficherSalles(){
    document.getElementById("roomsContainer").innerHTML ="";
    for(i=0 ; i<nombreSalles ; i++){
        document.getElementById("roomsContainer").innerHTML +=` 
         <!-- Salle F${i}-->
            <div class="col-md-6 col-lg-4" data-aos="fade-up">
                <div class="room-card">
                    <div class="room-image">
                        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600" alt="Salle F11">
                        <span class="status-badge status-libre">Libre</span>
                    </div>
                    <div class="room-content">
                        <h3 class="room-title">Salle F11</h3>
                        
                        <div class="room-info">
                            <div class="info-label">Capacité</div>
                            <div class="info-value">30 personnes</div>
                        </div>

                        <div class="material-section">
                            <div class="material-label">Matériel</div>
                            <span class="material-badge">30 PC</span>
                            <span class="material-badge">1 Projecteur</span>
                            <span class="material-badge">+1</span>
                        </div>

                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">Salle principale - Bon état</div>
                        </div>
                    </div>
                    <div class="room-actions">
                        <button class="btn-action btn-details">
                            <i class="fas fa-info-circle"></i> Détails
                        </button>
                        <button class="btn-action btn-modify">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-action btn-delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>

        `;
    }
}

getNombreSalles();

console.log("hello world 2");


