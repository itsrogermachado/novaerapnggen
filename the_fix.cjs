const fs = require('fs');
let code = fs.readFileSync('src/routes/app.tsx', 'utf-8');

// 1. imports
code = code.replace(/TextItem,\s*/g, '');

// 2. texts state
code = code.replace(/const \[texts, setTexts\] = useState<TextItem\[\]>\([\s\S]*?\}\],\n  \);\n/g, ''); // Wait, it's an array, not a function call
code = code.replace(/const \[texts, setTexts\] = useState<TextItem\[\]>\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*text: "Seu resultado aqui",\s*color: "#ffffff",\s*size: 64,\s*x: 0\.5,\s*y: 0\.5,\s*font: "inter",\s*\},\s*\]\);\n/g, '');

// 3. texts in CanvasState
code = code.replace(/\s*texts: undefined,/g, '');
code = code.replace(/\s*texts: \[\],/g, '');
code = code.replace(/\s*texts: state\.texts,/g, '');
code = code.replace(/logo,\s*texts,\s*format/g, 'logo, format');
code = code.replace(/logo,\s*texts\s*\}\}/g, 'logo }}');
code = code.replace(/texts,\n/g, '\n');

// 4. History
code = code.replace(/setLogo, setTexts, setFormat/g, 'setLogo, setFormat');

// 5. Math Layout
code = code.replace(/getForegroundSpace\(texts, logo, isStory\)/g, 'getForegroundSpace(logo, isStory)');
code = code.replace(/generateCohesiveLayout\([\s\S]*?texts\.length,\s*!!logo,\s*presetIndex\s*\);/g, 'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex);');
code = code.replace(/texts\.length, !!logo/g, '!!logo');

// 6. candidateTexts / nextTexts
code = code.replace(/\s*let candidateTexts = \[\.\.\.texts\];/g, '');
code = code.replace(/\s*const candidateTexts = \[\.\.\.texts\];/g, '');
code = code.replace(/\s*candidateTexts = nextTexts;/g, '');
code = code.replace(/\s*texts: nextTexts,/g, '');

code = code.replace(/\s*const randomFont = FONTS\[Math\.floor[\s\S]*?texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\s*};\s*}\);\n/g, '');
code = code.replace(/\s*const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?return \{ \.\.\.t, x: layoutText\.x, y: layoutText\.y, size: layoutText\.size \};\s*}\);\n/g, '');

// 7. Text Functions
code = code.replace(/\s*\/\/ Texts\s*const addText = \(\) => \{[\s\S]*?if \(selectedId === id\) setSelectedId\(null\);\s*};\n/g, '');

// 8. onPointerDown
code = code.replace(/kind: "text" \| "logo" \| "foreground"/g, 'kind: "logo" | "foreground"');
code = code.replace(/\s*if \(kind === "text" && id\) \{[\s\S]*?\} else if \(kind === "logo" && logo\) \{/g, '\n    if (kind === "logo" && logo) {');

// 9. canvas draw
code = code.replace(/\s*const wrapText = \([\s\S]*?return lines;\s*};\n/g, '');
code = code.replace(/\s*\/\/\s*texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\s*}\);\n/g, '');

// 10. UI Property Panel Texts
code = code.replace(/\s*\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?\}\)\(\)\}\s*<\/div>\s*\)\}\n/g, '\n');

// 11. UI Menu Texts
code = code.replace(/\s*\{\/\* Texts \*\/\}\s*<div className="space-y-3">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<hr className="border-border\/60" \/>\n/g, '\n          <hr className="border-border/60" />\n');

// 12. UI Draggable
code = code.replace(/\s*\{\/\* Draggable Texts with observer scaled font size \*\/\}\s*\{texts\.map\(\(t\) => \{[\s\S]*?<\/div>\s*\);\s*}\)\}\n/g, '\n');

fs.writeFileSync('src/routes/app.tsx', code);
console.log('done');
