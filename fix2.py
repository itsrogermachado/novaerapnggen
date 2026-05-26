import re

with open('src/lib/layout-utils.ts', 'r', encoding='utf-8') as f:
    layoutUtils = f.read()

# Fix layout-utils.ts errors:
# fgMinY used outside of scope or not defined?
# Wait, in getForegroundSpace:
# let fgMinY = isStory ? 0.18 : 0.16;
# let fgMaxY = isStory ? 0.88 : 0.85;
# I accidentally removed let fgMinY when replacing generateCohesiveLayout!
# Ah, generateCohesiveLayout had its own fgMinY.
layoutUtils = layoutUtils.replace("""
  if (layout.logo) {
    fgMinY = Math.max(fgMinY, layout.logo.y + 0.12);
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.2;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  layout.foregrounds = getForegroundCoordinates(numForegrounds, 0, fgMinY, fgMaxY);
""", """
  let fgMinY = isStory ? 0.18 : 0.16;
  let fgMaxY = isStory ? 0.88 : 0.85;

  if (layout.logo) {
    fgMinY = Math.max(fgMinY, layout.logo.y + 0.12);
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.2;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  layout.foregrounds = getForegroundCoordinates(numForegrounds, 0, fgMinY, fgMaxY);
""")

with open('src/lib/layout-utils.ts', 'w', encoding='utf-8') as f:
    f.write(layoutUtils)


with open('src/routes/app.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix app.tsx
code = re.sub(r'texts,\n\s*format,', 'format,', code)
code = re.sub(r'texts: nextTexts,', '', code)
code = re.sub(r'generateCohesiveLayout\([\s\S]*?texts\.length,[\s\S]*?\);', 'generateCohesiveLayout(format, foregrounds.length, !!logo, Math.floor(Math.random() * 3));', code)
code = re.sub(r'const nextTexts = texts\.map\([\s\S]*?\}\);\n', '', code)
code = re.sub(r'\} else if \(kind === "text" && id\) \{[\s\S]*?\}', '', code)
code = re.sub(r'if \(kind === "text" && id\) \{[\s\S]*?\} else if', 'if', code)
code = re.sub(r'\/\/ texts with font selection\n\s*texts\.forEach\(\(t\) => \{[\s\S]*?\}\);\n', '', code)
code = re.sub(r'const updateText = \([\s\S]*?;\n', '', code)
code = re.sub(r'const addText = \([\s\S]*?;\n', '', code)
code = re.sub(r'const removeText = \([\s\S]*?;\n', '', code)
code = re.sub(r'\{texts\.find\([\s\S]*?\}\)\}\n\s*<\/div>\n\s*\)\}\n', '', code)
code = re.sub(r'\{\/\* Texts \*\/\}\n\s*<div className="space-y-3">[\s\S]*?<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<hr className="border-border\/60" \/>\n', '', code)
code = re.sub(r'\{\/\* Draggable Texts with observer scaled font size \*\/\}\n\s*\{texts\.map\(\(t\) => \{[\s\S]*?\}\)\}\n', '', code)
code = re.sub(r'texts: texts,', '', code)
code = re.sub(r', texts', '', code)
code = re.sub(r'texts\.length === 0', 'true', code)
code = re.sub(r'texts\.map', '([].map)', code)

with open('src/routes/app.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
