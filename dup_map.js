const fs = require('fs');
let rs = fs.readFileSync('components/RSMapDivisions.tsx', 'utf-8');
const sp = rs
  .replace(/RSMapDivisions/g, 'SPMapDivisions')
  .replace(/rsPaths/g, 'spPaths')
  .replace(/rs-data/g, 'sp-data')
  .replace(/Rio Grande do Sul/g, 'São Paulo')
  .replace(/'RS'/g, "'SP'")
  .replace(/- RS/g, '- SP')
  .replace(/rs-municipal-map/g, 'sp-municipal-map');
fs.writeFileSync('components/SPMapDivisions.tsx', sp);
console.log('SPMapDivisions created!');
