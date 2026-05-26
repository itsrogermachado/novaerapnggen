const fs = require('fs');
let code = fs.readFileSync('src/routes/app.tsx', 'utf-8');

code = code.replace(/TextItem,\s*/g, '');
code = code.replace(/generateCohesiveLayout\(\s*format,\s*foregrounds\.length,\s*texts\.length,\s*!!logo,\s*presetIndex\s*\);/g, 'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex);');
code = code.replace(/const randomFont = FONTS\[Math\.floor[\s\S]*?texts: nextTexts,/g, '');

code = code.replace(/\s*texts: undefined,/g, '');
code = code.replace(/\s*texts: \[\],/g, '');
code = code.replace(/\s*texts: state\.texts,/g, '');
code = code.replace(/logo,\s*texts,/g, 'logo,');
code = code.replace(/\s*texts,\n/g, '\n');

code = code.replace(/const wrapText = \([\s\S]*?return lines;\s*};\n/g, '');
code = code.replace(/\/\/\s*texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\s*}\);/g, '');

// There is a texts.forEach block too. Let's make sure it's gone
code = code.replace(/texts\.forEach\(\(t\) => \{[\s\S]*?\}\);\n/g, '');

fs.writeFileSync('src/routes/app.tsx', code);
console.log('done');
