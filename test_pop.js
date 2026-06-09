const https = require('https');
https.get('https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[N3[35]]', res => {
  let data = ''; res.on('data', c => data+=c); res.on('end', () => console.log(data.substring(0, 500)));
});
