const fs = require('fs');
const https = require('https');

// We need d3-geo to convert GeoJSON to SVG paths
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
              
              const projection = d3Geo.geoMercator().fitSize([800, 600], geojson);
              const pathGenerator = d3Geo.geoPath().projection(projection);
              
              const paths = [];
              geojson.features.forEach(f => {
                  const id = f.properties.codarea;
                  const name = namesMap.get(id) || `Municipio_${id}`;
                  let svgPath = pathGenerator(f);
                  
                  // Fix D3 winding order rendering the whole globe bounding box 
                  // Because IBGE GeoJSON returns the polygon clockwise vs counter-clockwise
                  // The bounding box usually starts with M[screen bounds] so we split by ZM and take the first part
                  if (svgPath && svgPath.includes('ZM')) {
                      // There might be multiple polygons for islands, so we need to be careful.
                      // Usually the bounding box is a huge M700,0L... or M-something or M... Z M...
                      // Wait, the bounding box coords are exactly the corners of the globe limit or the clip extent.
                      // Let's just fix the GeoJSON winding order instead if possible or strip all sub-paths that are giant rectangles.
                      // Actually, if we just use a generic transform to scale and translate the points without spherical mercator, it works perfectly and avoids winding problems!
                  }
              });
          });
      });
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  });
}).on('error', err => {
  console.error("Fetch error:", err.message);
});
