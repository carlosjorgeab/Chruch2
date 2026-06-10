import fs from 'fs';
import path from 'path';

function findErrorText() {
  const chunksDir = '.next/server/chunks';
  if (!fs.existsSync(chunksDir)) {
    console.log('No chunks dir');
    return;
  }
  const files = fs.readdirSync(chunksDir);
  for (const f of files) {
    if (f.endsWith('.js')) {
      const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
      const idx = content.indexOf('<Html> should not be imported outside');
      if (idx !== -1) {
        console.log('FOUND IN', f);
        console.log(content.substring(idx - 300, idx + 300));
      }
    }
  }
}
findErrorText();
