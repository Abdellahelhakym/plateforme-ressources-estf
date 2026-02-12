let salles = [];


async function getNombreInfoSalles() {
    try {
        const response = await fetch('/Salles/Info');
        const data = await response.json();

        

        salles = data.salles;                
        console.log(salles);

        statistique();
       afficherFilter();
        afficherSalles("", "");

    } catch (err) {
        console.error("Erreur lors du fetch :", err);
    }
}

function statistique(){
    let total =0;
    let Disponible =0;
    let Occupee =0;
    let Maintenance =0;

   salles.forEach(ele=>{
    
    if(ele.etat == "Disponible"){
      Disponible ++;
    }
    if(ele.etat == "Occupée"){
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

function afficherFilter(){
    salles.forEach(ele=>{
        document.getElementById("roomFilter").innerHTML += `<option>Salle ${ele.nom_salle}</option> ` ;
    });

    
}

document.getElementById("roomFilter").addEventListener("change", filtrer);
document.getElementById("statusFilter").addEventListener("change", filtrer);

function filtrer() {
    const salle = document.getElementById("roomFilter").value;
    const etat = document.getElementById("statusFilter").value;
    afficherSalles(salle, etat);
}


function afficherSalles(filtreSalle = "", filtreEtat = "") {
    document.getElementById("roomsContainer").innerHTML = "";

    const sallesFiltrees = salles.filter(ele => {

        let okSalle = true;
        let okEtat = true;

        // Filtre par salle
        if (filtreSalle !== "") {
            okSalle = "Salle " + ele.nom_salle === filtreSalle;
        }

        // Filtre par état
        if (filtreEtat !== "") {
            okEtat = ele.etat === filtreEtat;
        }

        return okSalle && okEtat;
    });

    sallesFiltrees.forEach((ele, i) => {
        document.getElementById("roomsContainer").innerHTML += ` 
            <div class="col-md-6 col-lg-4" data-aos="fade-up">
                <div class="room-card">
                    <div class="room-image">
                        <img src="${ele.img}" alt="Salle ${ele.nom_salle}">
                        <span class="status-badge status-libre">${ele.etat}</span>
                    </div>
                    <div class="room-content">
                        <h3 class="room-title">Salle ${ele.nom_salle}</h3>

                        <div class="room-info">
                            <div class="info-label">Capacité</div>
                            <div class="info-value">${ele.capacite} personnes</div>
                        </div>

                        <div class="room-info">
                            <div class="info-label">Batiment</div>
                            <div class="info-value">${ele.batiment}</div>
                        </div>

                        <div class="room-info">
                            <div class="info-label">Type de salle</div>
                            <div class="info-value">${ele.type_salle}</div>
                        </div>

                        <div class="remarks-section">
                            <div class="remarks-label">Remarques</div>
                            <div class="remarks-text">${ele.Remarques}</div>
                        </div>
                    </div>

                    <div class="room-actions">
                        <button class="btn-action btn-modify">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-action btn-delete" onclick="suprimer(${ele.id_salle})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
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



