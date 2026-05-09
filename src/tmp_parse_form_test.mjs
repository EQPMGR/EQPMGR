const parserModule = await import('./lib/bike-parser.ts');
const { parseBikeText } = parserModule.default ?? parserModule;
const sample = `Bike Model X
Brand: Shimano
Shift/brake lever: Shimano Dura-Ace ST-R9270
Brake Caliper: Shimano Dura-Ace BR-R9270
Brake Rotor: Shimano RT-CL900 160mm
Shifter Casing: Shimano`;
const parsed = parseBikeText(sample);
console.log('PARSED:', JSON.stringify(parsed, null, 2));
const BASE_COMPONENTS = [{name:'Front Shifter'},{name:'Rear Shifter'},{name:'Front Brake'},{name:'Rear Brake'},{name:'Front Rotor'},{name:'Rear Rotor'}];
const componentMap = new Map(BASE_COMPONENTS.map((comp, index) => [comp.name.toLowerCase(), index]));
const updatedComponents = BASE_COMPONENTS.map(c => ({...c, brand:'', series:'', model:'', size:''}));
parsed.components.forEach(importedComp => {
  const cleanedName = importedComp.name.toLowerCase().trim();
  const componentToUpdate = {brand: importedComp.brand||'', series: importedComp.series||'', model: importedComp.model||'', size: importedComp.size||''};
  const dualComponentMap = {
    'shift-/ brake lever': ['Front Shifter','Rear Shifter'],
    'shifter': ['Front Shifter','Rear Shifter'],
    'brake caliper': ['Front Brake','Rear Brake'],
    'brake rotor': ['Front Rotor','Rear Rotor'],
    'brake': ['Front Brake','Rear Brake'],
    'wheel': ['Front Wheel','Rear Wheel'],
    'tire': ['Front Tire','Rear Tire'],
    'rim': ['Front Rim','Rear Rim'],
    'hub': ['Front Hub','Rear Hub'],
    'skewer': ['Front Skewer','Rear Skewer'],
  };
  let wasMapped = false;
  for (const key in dualComponentMap) {
    if (cleanedName.includes(key)) {
      dualComponentMap[key].forEach(targetName => {
        const index = componentMap.get(targetName.toLowerCase());
        if (index !== undefined) {
          Object.assign(updatedComponents[index], componentToUpdate);
        }
      });
      wasMapped = true;
      break;
    }
  }
  if (!wasMapped) {
    const index = componentMap.get(cleanedName);
    if (index !== undefined) {
      Object.assign(updatedComponents[index], componentToUpdate);
    } else {
      updatedComponents.push({...importedComp, id:'x'});
    }
  }
});
console.log('MAPPED:', JSON.stringify(updatedComponents, null, 2));
