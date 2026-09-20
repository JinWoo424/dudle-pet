export function chooseNearbyPharmacyRadius(distances:number[]){
 const valid=distances.filter(Number.isFinite);
 if(valid.filter(distance=>distance<=3000).length>=2)return 3000;
 if(valid.filter(distance=>distance<=5000).length>=2)return 5000;
 return 10000;
}
