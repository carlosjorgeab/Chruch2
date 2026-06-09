const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = searchFiles(fullPath);
      if (found) return true;
    } else {
      if (fullPath.endsWith('.txt') || fullPath.endsWith('.md') || fullPath.endsWith('.log')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // specifically look for the path entries
          if (content.includes('Aceguá_RS') && content.includes('d="m')) {
            console.log("Found data in: " + fullPath);
            const regex = /<path id="([^"]+_RS)"[^>]*d="([^"]+)"/g;
            const paths = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
              paths.push({ id: match[1], d: match[2] });
            }
            if (paths.length > 300) {
              const fileContent = `export interface RSPath {\n  id: string;\n  d: string;\n}\n\nexport const rsPaths: RSPath[] = ` + JSON.stringify(paths, null, 2) + ';\n';
              fs.writeFileSync('/app/applet/components/rs-data.ts', fileContent);
              console.log("Wrote rs-data.ts with " + paths.length + " paths!");
              return true;
            }
          }
        } catch(e) {
          // ignore read errors
        }
      }
    }
  }
  return false;
}

try {
  const found = searchFiles('/.gemini');
  if (!found) {
    console.log("Could not find the SVG data in the logs.");
  }
} catch(e) {
  console.error("Error during search:", e);
}
