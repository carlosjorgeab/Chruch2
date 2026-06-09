const fs = require('fs');
const https = require('https');
const d3Geo = require('d3-geo');

console.log('Fetching IBGE RS GeoJSON...');
https.get('https://servicodados.ibge.gov.br/api/v3/malhas/estados/RS?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const geojson = JSON.parse(data);
      console.log(`Received geojson with ${geojson.features.length} features`);
      
      https.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RS/municipios', (nameRes) => {
          let nameData = '';
          nameRes.on('data', chunk => nameData += chunk);
          nameRes.on('end', () => {
              const names = JSON.parse(nameData);
              const namesMap = new Map();
              names.forEach(n => namesMap.set(n.id.toString(), n.nome));
              
              // Use geoIdentity with reflectY to map long/lat directly to X/Y without spherical clip
              const projection = d3Geo.geoIdentity().reflectY(true).fitSize([800, 600], geojson);
              const pathGenerator = d3Geo.geoPath().projection(projection);
              
              const paths = [];
              geojson.features.forEach(f => {
                  const id = f.properties.codarea;
                  const name = namesMap.get(id) || `Municipio_${id}`;
                  let svgPath = pathGenerator(f);
                  
                  // Limit the decimals to keep file size small
                  if (svgPath) {
                      svgPath = svgPath.replace(/(\d+\.\d{2})\d+/g, '$1'); 
                  }
                  
                  paths.push({
                      id: id,
                      name: name,
                      d: svgPath
                  });
              });
              
              const output = `export interface RSPath {
  id: string;
  name: string;
  d: string;
}

export const rsPaths: RSPath[] = ${JSON.stringify(paths, null, 2).replace(/"id":/g, 'id:').replace(/"name":/g, 'name:').replace(/"d":/g, 'd:')};
`;
              fs.writeFileSync('./components/rs-data.ts', output);
              console.log(`Successfully wrote ${paths.length} mapped paths to ./components/rs-data.ts!`);
          });
      });
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  });
}).on('error', err => {
  console.error("Fetch error:", err.message);
});
