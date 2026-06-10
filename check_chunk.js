import fs from 'fs';
const file = fs.readFileSync('.next/server/chunks/611.js', 'utf8');
const snippets = file.match(/.{0,50}Html.{0,50}/g);
console.log(snippets);
