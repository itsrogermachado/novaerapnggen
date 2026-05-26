const fs = require('fs');
let code = fs.readFileSync('src/routes/app.tsx', 'utf-8');

code = code.replace(/setTexts\([\s\S]*?\n/g, '');
code = code.replace(/candidateTexts = nextTexts;/g, '');
code = code.replace(/\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?\}\)\}\n\s*<\/div>\n\s*\)\}\n/g, '');
code = code.replace(/\{\/\* Texts \*\/\}\n\s*<div className="space-y-3">[\s\S]*?<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<hr className="border-border\/60" \/>\n/g, '');
code = code.replace(/\{\/\* Draggable Texts with observer scaled font size \*\/\}\n\s*\{texts\.map\(\(t\) => \{[\s\S]*?\}\)\}\n/g, '');
code = code.replace(/if \(kind === "text" && id\) \{[\s\S]*?\} else if/g, 'if');
code = code.replace(/kind: "text" \| "logo" \| "foreground"/g, 'kind: "logo" | "foreground"');
code = code.replace(/const item = texts\.find\(\(t\) => t\.id === id\)!;/g, '');
code = code.replace(/texts\.forEach\(\(t\) => \{[\s\S]*?\}\);\n/g, '');

// 724:
code = code.replace(/const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\n\s*};\n\s*}\);\n/g, '');
code = code.replace(/const randomFont = FONTS\[Math\.floor\(Math\.random\(\) \* FONTS\.length\)\]\.id;\n/g, '');
code = code.replace(/const highlightColors = \["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"\];\n/g, '');
code = code.replace(/const mainColor = highlightColors\[Math\.floor\(Math\.random\(\) \* highlightColors\.length\)\];\n/g, '');
code = code.replace(/const subColor = mainColor === "#ffffff" \? highlightColors\[Math\.floor\(1 \+ Math\.random\(\) \* \(highlightColors\.length - 1\)\)\] : "#ffffff";\n/g, '');

code = code.replace(/const addText = \(\) => \{[\s\S]*?\}\n\s*\}\);[\s\S]*?\}\};\n/g, '');
code = code.replace(/const updateText = \([\s\S]*?;\n/g, '');
code = code.replace(/const removeText = \([\s\S]*?;\n/g, '');

fs.writeFileSync('src/routes/app.tsx', code);
console.log('done');
