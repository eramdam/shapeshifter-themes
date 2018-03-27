const fs = require('fs');

const fileContent = fs.readFileSync('./resexcellence.md', { encoding: 'utf8' });

console.log(fileContent.split('---\n---')[0]);
