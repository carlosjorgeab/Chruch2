const https = require('https');

https.get('https://upload.wikimedia.org/wikipedia/commons/e/ea/Rio_Grande_do_Sul_MesoMicroMunicip.svg', (res) => {
  let data = '';
  res.on('data', chunk => {
      data += chunk;
      if (data.length > 5000) {
          res.destroy(); // stop downloading
          console.log(data.substring(0, 1000));
      }
  });
});
