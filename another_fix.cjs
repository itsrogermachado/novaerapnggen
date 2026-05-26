const fs = require('fs');
let c = fs.readFileSync('src/routes/app.tsx', 'utf-8');

c = c.replace(/const \[texts, setTexts\] = useState<any\[\]>\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*text: "Seu resultado aqui",\s*color: "#ffffff",\s*size: 64,\s*x: 0\.5,\s*y: 0\.5,\s*font: "inter",\s*\},\s*\]\);\n/g, '');

c = c.replace(/\s*texts,\s*\n/g, '\n');

// The layoutText error
c = c.replace(/const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\s*};\s*}\);\n/g, '');
// Since we deleted `const layoutText...` but left the inside of the map, we need to clean `nextTexts` block manually:
c = c.replace(/const randomFont = FONTS\[Math\.floor\(Math\.random\(\) \* FONTS\.length\)\]\.id;\n/g, '');
c = c.replace(/const highlightColors = \["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"\];\n/g, '');
c = c.replace(/const mainColor = highlightColors\[Math\.floor\(Math\.random\(\) \* highlightColors\.length\)\];\n/g, '');
c = c.replace(/const subColor = mainColor === "#ffffff" \? highlightColors\[Math\.floor\(1 \+ Math\.random\(\) \* \(highlightColors\.length - 1\)\)\] : "#ffffff";\n/g, '');
c = c.replace(/const nextTexts = texts\.map\(\(t, idx\) => \{\s*return \{\s*\.\.\.t,\s*x: layoutText\?\.x \?\? t\.x,\s*y: layoutText\?\.y \?\? t\.y,\s*size: layoutText\?\.size \?\? t\.size,\s*font: randomFont,\s*color: idx === 0 \? mainColor : subColor,\s*\};\s*\}\);\n/g, '');

fs.writeFileSync('src/routes/app.tsx', c);
console.log("Done");
