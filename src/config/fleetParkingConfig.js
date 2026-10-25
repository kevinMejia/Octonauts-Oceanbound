// Stable, outward-facing berths on the cleared sand around the Octopod.
// The open front channel leaves a direct approach to the headquarters.
export const fleetParkingRadius=24;
// Hide at the existing distance; briefly retain nearby GPU resources to avoid churn.
export const fleetResidencyConfig={visibleDistance:160,releaseDistance:180,graceMs:3000};
export const fleetParkingAngles=Object.freeze({'gup-a':-35,'gup-b':35,'gup-c':-70,'gup-d':70,'gup-e':-105,'gup-f':105,'gup-q':-140,'gup-r':140});
export function withOctopodBerth(definition){
 const degrees=fleetParkingAngles[definition.id];if(degrees===undefined)return definition;
 const heading=degrees*Math.PI/180,round=value=>Math.round(value*1000)/1000;
 return {...definition,parking:{...definition.parking,spawn:{relativeTo:'octopod',offset:[round(Math.sin(heading)*fleetParkingRadius),0,round(Math.cos(heading)*fleetParkingRadius)]},rotation:heading}};
}
