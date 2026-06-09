const https = require('https');

https.get('https://upload.wikimedia.org/wikipedia/commons/e/ea/Rio_Grande_do_Sul_MesoMicroMunicip.svg', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const paths = [];
    const regex = /<path[^>]+id="([^"]+_RS)"[^>]*d="([^"]+)"/g;
    let match;
    while((match = regex.exec(data)) !== null) {
      paths.push({ id: match[1], d: match[2] });
    }
    
    if (paths.length === 0) {
        const regex2 = /<path[^>]*d="([^"]+)"[^>]+id="([^"]+_RS)"/g;
        while((match = regex2.exec(data)) !== null) {
          paths.push({ id: match[2], d: match[1] });
        }
    }
    
    console.log(`Found ${paths.length} paths matching _RS.`);
    if (paths.length > 0) {
      console.log(paths[0]);
    }
  });
});
