const fs = require('fs');

let text = fs.readFileSync('src/routes/app.tsx', 'utf8');

text = text.replace(/texts\.length/g, '0');
text = text.replace(/texts: nextTexts,/g, '');
text = text.replace(/texts: candidateTexts,/g, '');
text = text.replace(/updateText\(.*?\);/g, '');

// Also any remaining `texts.forEach` block
text = text.replace(/\/\/\s*texts\s*with\s*font\s*selection[\s\S]*?texts\.forEach\(\(t\)\s*=>\s*\{[\s\S]*?ctx\.shadowColor = "transparent";\s*\}\);/g, '');

fs.writeFileSync('src/routes/app.tsx', text);
console.log('done');
