const fs = require('fs');

async function run() {
  const content = fs.readFileSync('rs_full.svg', 'utf8');
  const paths = [];
  const regex = /<path id="([^"]+)"[^>]+d="([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    paths.push({ id: match[1], d: match[2] });
  }

  const output = `
export interface RSPath {
  id: string;
  d: string;
}

export const rsPaths: RSPath[] = ${JSON.stringify(paths, null, 2)};
`;

  fs.writeFileSync('components/rs-data.ts', output);
  console.log(`Extracted ${paths.length} paths to components/rs-data.ts`);
}

run();
