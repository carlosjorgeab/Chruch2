const https = require('https');

https.get('https://upload.wikimedia.org/wikipedia/commons/e/ea/Rio_Grande_do_Sul_MesoMicroMunicip.svg', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let match = /<path([^>]+)>/i.exec(data);
    if(match) console.log("First path attrs:", match[1]);
    
    // lets find all paths and see their id format
    const paths = [];
    let r = /<path[^>]*d="([^"]+)"/g;
    let match2;
    let count = 0;
    while((match2 = r.exec(data)) !== null) { count++; }
    console.log("Total paths with d=" + count);
  });
});
