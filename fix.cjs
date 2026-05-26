const fs = require('fs');
let code = fs.readFileSync('src/routes/app.tsx', 'utf-8');

// src/lib/layout-utils.ts fixes (since they still have some errors)
let layoutUtils = fs.readFileSync('src/lib/layout-utils.ts', 'utf-8');
layoutUtils = layoutUtils.replace(/const { fgMinY, fgMaxY } = getForegroundSpace\(texts, logo, isStory\);/g, 'const { fgMinY, fgMaxY } = getForegroundSpace(logo, isStory);');
layoutUtils = layoutUtils.replace(/getForegroundSpace\([\s\S]*?texts: TextItem\[\],[\s\S]*?currentLogo: LogoState,/g, 'getForegroundSpace(currentLogo: LogoState,');
// Actually layoutUtils is mostly fine but we had some remaining texts logic in `generateCohesiveLayout` maybe? Let me just fix app.tsx first.

// app.tsx
// texts, in state object
code = code.replace(/\n\s*texts,\n\s*format,/g, '\n      format,');
code = code.replace(/texts: nextTexts,\n/g, '');
code = code.replace(/let candidateTexts = \[\.\.\.texts\];\n/g, '');
code = code.replace(/texts\.length,/g, '');

// setTexts
code = code.replace(/setTexts(.*?);/g, '');
code = code.replace(/const nextTexts = texts\.map\(\([\s\S]*?\}\);\n/g, '');

// texts.forEach
code = code.replace(/\/\/ texts with font selection\n\s*texts\.forEach\(\(t\) => \{[\s\S]*?\}\);\n/g, '');

// TextItem
code = code.replace(/TextItem\[\],/g, '');
code = code.replace(/<TextItem\[\]>/g, '');

// remove addText, updateText
code = code.replace(/const addText = \(\) => \{[\s\S]*?\}\n\s*\}\);[\s\S]*?\}\};\n/g, '');

// remove texts UI
code = code.replace(/\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?\}\)\}\n\s*<\/div>\n\s*\)\}\n/g, '');
code = code.replace(/\{\/\* Texts \*\/\}\n\s*<div className="space-y-3">[\s\S]*?<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<hr className="border-border\/60" \/>\n/g, '');

// remove text rendering
code = code.replace(/\{\/\* Draggable Texts with observer scaled font size \*\/\}\n\s*\{texts\.map\(\(t\) => \{[\s\S]*?\}\)\}\n/g, '');

// onPointerDown text check
code = code.replace(/if \(kind === "text" && id\) \{[\s\S]*?\} else if/g, 'if');
code = code.replace(/kind: "text" \| "logo" \| "foreground"/g, 'kind: "logo" | "foreground"');

// remove Texts from CanvasState type usages if any
code = code.replace(/texts: texts,/g, '');
code = code.replace(/, texts/g, '');

fs.writeFileSync('src/routes/app.tsx', code);
fs.writeFileSync('src/lib/layout-utils.ts', layoutUtils);

console.log('done');
