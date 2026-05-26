const fs = require('fs');
let code = fs.readFileSync('src/routes/app.tsx', 'utf-8');

code = code.replace(/const randomFont = FONTS\[Math\.floor[\s\S]*?texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\n\s*};\n\s*}\);\n/g, '');
code = code.replace(/candidateTexts = nextTexts;\s*/g, '');

fs.writeFileSync('src/routes/app.tsx', code);
console.log('done');
