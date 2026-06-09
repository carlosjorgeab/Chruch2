const fs = require('fs');
const https = require('https');
const d3Geo = require('d3-geo');

console.log('Fetching IBGE SP GeoJSON...');
https.get('https://servicodados.ibge.gov.br/api/v3/malhas/estados/SP?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio', (res) => {
  let data = ''; res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const geojson = JSON.parse(data);
    
    https.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios', (nameRes) => {
        let nameData = ''; nameRes.on('data', chunk => nameData += chunk);
        nameRes.on('end', () => {
            const names = JSON.parse(nameData);
            const namesMap = new Map();
            names.forEach(n => namesMap.set(n.id.toString(), n.nome));
            
            https.get('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[N3[35]]', (popRes) => {
                let popData = ''; popRes.on('data', chunk => popData += chunk);
                popRes.on('end', () => {
                    const popParsed = JSON.parse(popData);
                    const populationMap = new Map();
                    if(popParsed.length > 0 && popParsed[0].resultados.length > 0) {
                        popParsed[0].resultados[0].series.forEach(item => {
                            const id = item.localidade.id;
                            const popValue = item.serie['2021'];
                            populationMap.set(id, parseInt(popValue, 10));
                        });
                    }

                    const projection = d3Geo.geoIdentity().reflectY(true).fitSize([800, 600], geojson);
                    const pathGenerator = d3Geo.geoPath().projection(projection);
                    
                    const paths = [];
                    let sqlInserts = `DELETE FROM municipio WHERE id_uf = (SELECT id FROM unidade_federacao WHERE sigla = 'SP');\n\n`;
                    sqlInserts += `INSERT INTO municipio (nome, id_uf, latitude, longitude, populacao) VALUES\n`;
                    const values = [];

                    geojson.features.forEach(f => {
                        const id = f.properties.codarea;
                        const name = namesMap.get(id) || `Municipio_${id}`;
                        const populacao = populationMap.get(id) || 'NULL';
                        let svgPath = pathGenerator(f);
                        
                        if (svgPath) {
                            svgPath = svgPath.replace(/(\d+\.\d{2})\d+/g, '$1'); 
                        }
                        
                        paths.push({
                            id: id,
                            name: name,
                            d: svgPath
                        });
                        
                        const escapedName = name.replace(/'/g, "''");
                        values.push(`('${escapedName}', (SELECT id FROM unidade_federacao WHERE sigla = 'SP'), NULL, NULL, ${populacao})`);
                    });
                    
                    sqlInserts += values.join(',\n') + ';\n';
                    
                    const tsOutput = `export interface SPPath {\n  id: string;\n  name: string;\n  d: string;\n}\n\nexport const spPaths: SPPath[] = ${JSON.stringify(paths, null, 2).replace(/"id":/g, 'id:').replace(/"name":/g, 'name:').replace(/"d":/g, 'd:')};\n`;
                    fs.writeFileSync('./components/sp-data.ts', tsOutput);
                    fs.writeFileSync('./sp-migrations.sql', sqlInserts);
                    
                    console.log(`Successfully wrote ${paths.length} paths and SQL migration with population!`);
                });
            });
        });
    });
  });
});
