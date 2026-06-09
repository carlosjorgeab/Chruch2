const fs = require('fs');

async function fetchMunicipios() {
  console.log('Fetching municipality list...');
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios');
  const data = await res.json();
  const municipios = data.map(m => ({ id: m.id.toString(), name: m.nome }));
  console.log(`Found ${municipios.length} municipalities.`);
  return municipios;
}

async function fetchMalha(id) {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${id}?qualidade=minima`;
  const res = await fetch(url);
  const svg = await res.text();
  // Extract path d attribute
  const match = svg.match(/d="([^"]+)"/);
  return match ? match[1] : null;
}

async function run() {
  const municipios = await fetchMunicipios();
  const paths = [];
  
  // To avoid hitting IBGE too hard and timing out, we do batches
  const batchSize = 25;
  for (let i = 0; i < municipios.length; i += batchSize) {
    const batch = municipios.slice(i, i + batchSize);
    console.log(`Fetching batch ${i / batchSize + 1}/${Math.ceil(municipios.length / batchSize)}...`);
    
    const results = await Promise.all(batch.map(async (m) => {
      try {
        const d = await fetchMalha(m.id);
        if (d) {
          return { id: m.id, name: m.name, d };
        }
      } catch (e) {
        console.error(`Error fetching ${m.name} (${m.id}):`, e);
      }
      return null;
    }));
    
    paths.push(...results.filter(r => r !== null));
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const output = `
export interface PRPath {
  id: string;
  name: string;
  d: string;
}

export const prPaths: PRPath[] = ${JSON.stringify(paths, null, 2)};
`;

  fs.writeFileSync('components/pr-data.ts', output);
  console.log(`Successfully wrote ${paths.length} paths to components/pr-data.ts`);
}

run();
