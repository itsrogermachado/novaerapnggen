import codecs
import re

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

# 1. texts: candidateTexts or texts: nextTexts
app = re.sub(r'\s*texts: [a-zA-Z]+,\n', '\n', app)
# Also texts: undefined, texts: [], texts: state.texts
app = re.sub(r'\s*texts: undefined,\n', '\n', app)
app = re.sub(r'\s*texts: \[\],\n', '\n', app)
app = re.sub(r'\s*texts: state\.texts,\n', '\n', app)

# 2. texts.map and nextTexts inside randomizeAll
app = re.sub(r'\s*const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\s*};\s*}\);\n', '\n', app)
app = re.sub(r'\s*const randomFont = FONTS\[Math\.floor[\s\S]*?const subColor = mainColor[\s\S]*?\]\s*:\s*"#ffffff";\n', '\n', app)
app = re.sub(r'\s*setTexts\([a-zA-Z]+\);\n', '\n', app)

# 3. Texts functions
app = re.sub(r'\s*\/\/ Texts\s*const addText = \(\) => \{[\s\S]*?if \(selectedId === id\) setSelectedId\(null\);\s*};\n', '\n', app)

# 4. texts.forEach in download
app = re.sub(r'\s*\/\/\s*texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\s*}\);\n', '\n', app)
# There is a different texts loop in download possibly (t.size * exportScale)
app = re.sub(r'\s*\/\/\s*texts with font selection[\s\S]*?\}\);\s*\}\);\n', '\n', app)

# 5. UI Property panel texts
app = re.sub(r'\s*\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?\}\)\(\)\}\s*<\/div>\s*\)\}\n', '\n', app)

# 6. UI Texts menu (if present)
app = re.sub(r'\s*\{\/\* Texts \*\/\}\s*<div className="space-y-3">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<hr className="border-border\/60" \/>\n', '\n          <hr className="border-border/60" />\n', app)

# 7. UI Draggable mapping
app = re.sub(r'\s*\{\/\* Draggable Texts with observer scaled font size \*\/\}\s*\{texts\.map\(\(t\) => \{[\s\S]*?<\/div>\s*\);\s*}\)\}\n', '\n', app)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)
print("Done")
