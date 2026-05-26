const fs = require('fs');
let content = fs.readFileSync('src/routes/app.tsx', 'utf-8');

// Error 1: Cannot find name 'TextItem'
content = content.replace(/const \[texts, setTexts\] = useState<TextItem\[\]>\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*text: "Seu resultado aqui",\s*color: "#ffffff",\s*size: 64,\s*x: 0\.5,\s*y: 0\.5,\s*font: "inter",\s*\},\s*\]\);\n/, '');
content = content.replace(/patch: Partial<TextItem>/g, 'patch: any');

// Errors 557, 578, 612, 652, 681: 'texts' does not exist in type 'CanvasState'
// These are likely `texts: candidateTexts` or `texts: state.texts` inside candidate state generation
content = content.replace(/texts: [\w.]+,\s*\n/g, '');

// Error 741: Property 'texts' does not exist on type 'ElementLayouts'
content = content.replace(/const layoutText = layout\.texts\[idx\];/g, '');
content = content.replace(/texts: nextTexts,\s*\n/g, '');

// Error 924: Parameter 'line' implicitly has an 'any' type (in wrapText which is dead code, or in texts.forEach lines.forEach)
content = content.replace(/\s*lines\.forEach\(\(line, i\) => \{[\s\S]*?\}\);\s*\n/g, '');

// Error 1689: '"text"' is not assignable to '"logo" | "foreground"'
// This is the pointer down event for texts `<div onPointerDown={(e) => onPointerDown(e, "text", t.id)}`
// Let's just rip out the whole texts UI loop: `{texts.map((t) => { ... })}`
content = content.replace(/\{texts\.map\(\(t\) => \{[\s\S]*?<\/div>\s*\);\s*\}\)\}/g, '');

fs.writeFileSync('src/routes/app.tsx', content);
