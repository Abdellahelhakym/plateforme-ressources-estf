let materiel = [];
console.log("test");


async function getNombreInfoMateriel() {
    try {
        const response = await fetch('/materiel/Info');
        const data = await response.json();

        materiel = data.materiel;    
          
        console.log(materiel);
        statistique();
        afficherFilter();
        afficherMateriel("", "");
        

    } catch (err) {
        console.error("Erreur lors du fetch :", err);
    }
}

function statistique(){
    let total =0;
    let Disponible =0;
    let Occupee =0;
    let Maintenance =0;

   materiel.forEach(ele=>{
    
    if(ele.etat == "Disponible"){
      Disponible ++;
    }
    if(ele.etat == "Occupee"){
      Occupee ++;
    }
    if(ele.etat == "En Maintenance"){
      Maintenance ++;
    }
    total++;
   });

   
   document.getElementById("Disponible").innerHTML=Disponible;
   document.getElementById("Occupee").innerHTML=Occupee;
   document.getElementById("Maintenance").innerHTML=Maintenance;
   document.getElementById("total").innerHTML=total;
}

function afficherFilter() {
    const select = document.getElementById("roomFilter");
    select.innerHTML = `<option value="">Toutes les salles</option>`;

    const sallesUniques = new Set(); // Stocker les salles sans doublons

    materiel.forEach(ele => {
        sallesUniques.add(ele.salle);
    });

    sallesUniques.forEach(salle => {
        select.innerHTML += `<option value="${salle}">${salle}</option>`;
    });
}


document.getElementById("roomFilter").addEventListener("change", filtrer);
document.getElementById("statusFilter").addEventListener("change", filtrer);

function filtrer() {
    const salle = document.getElementById("roomFilter").value;
    const etat = document.getElementById("statusFilter").value;
    afficherMateriel(salle, etat);
}

function afficherMateriel(filtreSalle = "", filtreEtat = ""){
    document.getElementById("roomsContainer").innerHTML = "";
    

    const materielFiltres = materiel.filter(ele => {
        let okSalle = filtreSalle === "" || ele.salle === filtreSalle;
        let okEtat = filtreEtat === "" || ele.etat === filtreEtat;
        return okSalle && okEtat;
    });

    materielFiltres.forEach((ele, i) => {
        
        document.getElementById("roomsContainer").innerHTML += ` 
            <div class="col-md-6 col-lg-3" data-aos="fade-up">
                <div class="material-card">
                    <div class="material-image">
                        <img src="${ele.img}" alt="${ele.nom_materiel}">
                        <span class="status-badge status-fonctionnel">${ele.etat}</span>
                        <span class="room-badge">${ele.salle}</span>
                    </div>
                    <div class="material-content">
                        <span class="type-badge">${ele.type_materiel}</span>
                        <h3 class="material-name">${ele.nom_materiel}</h3>
                        <p class="material-quantity">Quantité: <span>${ele.quantite}</span></p>
                        
                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${ele.Remarques}</div>
                        </div>
                       
                        <button class="btn-details btn-delete" onclick="suprimer(${ele.id_materiel})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

  
}



getNombreInfoMateriel();

async function suprimer(x){
   console.log(x);

   try{
         const suprimer = await fetch('/materiel/supprimer', {
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
