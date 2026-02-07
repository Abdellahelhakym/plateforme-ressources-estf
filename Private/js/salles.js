let salles = [];
let nombreSalles ;

async function getNombreInfoSalles() {
    try {
        const response = await fetch('/Salles/nombreInfo');
        const data = await response.json();

        console.log(data);

        salles = data.salles;                
        nombreSalles = data.nombre_salles; 
       
        afficherSalles();

    } catch (err) {
        console.error("Erreur lors du fetch :", err);
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
                        <img src="${salles[i].img}" alt="Salle F11">
                        <span class="status-badge status-libre">${salles[i].etat}</span>
                    </div>
                    <div class="room-content">
                        <h3 class="room-title">Salle ${salles[i].nom_salle} </h3>
                        
                        <div class="room-info">
                            <div class="info-label">Capacité</div>
                            <div class="info-value">${salles[i].capacite} personnes</div>
                        </div>

                         <div class="room-info">
                            <div class="info-label">Batiment </div>
                            <div class="info-value">${salles[i].batiment} </div>
                        </div>
                         <div class="room-info">
                            <div class="info-label">Type de salle </div>
                            <div class="info-value">${salles[i].type} </div>
                        </div>

                        <div class="material-section">
                            <div class="material-label">Matériel</div>
                            <span class="material-badge">30 PC</span>
                            <span class="material-badge">1 Projecteur</span>
                            <span class="material-badge">+1</span>
                        </div>

                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${salles[i].Remarques}</div>
                        </div>
                    </div>
                    <div class="room-actions">
                       
                        <button class="btn-action btn-modify">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-action btn-delete" onclick="suprimer(${salles[i].id_salle})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>

        `;
    }
}

getNombreInfoSalles();



async function suprimer(x){
   console.log(x);

   try{
         const suprimer = await fetch('/Salles/supprimer', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify({ id: x })
      });

       window.location.reload(); 

   }catch (err) {
      console.error("Erreur réseau :", err);
   }
}



