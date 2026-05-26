import re
import codecs

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

# 1. texts in CanvasState literals
app = re.sub(r'\s*texts,\n', '\n', app)

# 2. texts.length in generateCohesiveLayout
app = re.sub(r'foregrounds\.length,\s*texts\.length,\s*!!logo,', r'foregrounds.length,\n        !!logo,', app)

# 3. ElementLayouts text removal in random generator
# This matches the nextTexts logic
app = re.sub(r'\s*const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\s*};\s*}\);\n', '', app)
app = re.sub(r'\s*texts: nextTexts,', '', app)

# 4. wrapText and loop
app = re.sub(r'\s*const wrapText = \([\s\S]*?return lines;\s*};\n', '', app)
app = re.sub(r'\s*\/\/\s*texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\s*}\);\n', '', app)

# 5. TextItem in updateText
app = re.sub(r'patch: Partial<TextItem>', 'patch: any', app)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)
