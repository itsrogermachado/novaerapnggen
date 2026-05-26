const fs = require('fs');
let c = fs.readFileSync('src/routes/app.tsx', 'utf-8');

c = c.replace(/const \[texts, setTexts\] = useState<TextItem\[\]>\(\[[\s\S]*?\]\);\n/g, '');

c = c.replace(/x: layoutText\?\.x \?\? t\.x,\s*\n/g, '');
c = c.replace(/y: layoutText\?\.y \?\? t\.y,\s*\n/g, '');
c = c.replace(/size: layoutText\?\.size \?\? t\.size,\s*\n/g, '');

fs.writeFileSync('src/routes/app.tsx', c);
console.log("Done");
