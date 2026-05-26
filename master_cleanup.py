import codecs
import re

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

# 1. imports
app = app.replace('TextItem, ', '')

# 2. State definition
app = re.sub(r'\s*const \[texts, setTexts\] = useState<TextItem\[\]>\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*text: "Seu resultado aqui",\s*color: "#ffffff",\s*size: 64,\s*x: 0\.5,\s*y: 0\.5,\s*font: "inter",\s*\},\s*\]\);\n', '\n', app)

# 3. CanvasState types
app = app.replace('texts: undefined,\n', '')
app = app.replace('texts: [],\n', '')
app = app.replace('texts: state.texts,\n', '')
app = app.replace('      texts,\n', '')
app = app.replace('texts: nextTexts,', '')
app = app.replace('logo, texts, format', 'logo, format')
app = app.replace('logo, texts }', 'logo }')
app = app.replace('setTexts, ', '')

# 4. Math & dependencies
app = app.replace('getForegroundSpace(texts, logo, isStory)', 'getForegroundSpace(logo, isStory)')
app = app.replace('}, [foregrounds.length, format, texts.length, !!logo]);', '}, [foregrounds.length, format, !!logo]);')

# 5. generateCohesiveLayout
app = re.sub(r'generateCohesiveLayout\(\s*format,\s*foregrounds\.length,\s*texts\.length,\s*!!logo,\s*presetIndex\s*\);',
             'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex);', app)

# 6. randomize mapping and candidateTexts
app = re.sub(r'\s*let candidateTexts = \[\.\.\.texts\];\n', '\n', app)
app = re.sub(r'\s*const candidateTexts = \[\.\.\.texts\];\n', '\n', app)
app = re.sub(r'\s*candidateTexts = nextTexts;\n', '\n', app)
app = re.sub(r'\s*candidateTexts = nextTexts;', '', app)
app = re.sub(r'\s*setTexts\(candidateTexts\);\n', '\n', app)

app = re.sub(r'\s*const randomFont = FONTS\[Math\.floor[\s\S]*?texts\.map\(\(t, idx\) => \{[\s\S]*?color: idx === 0 \? mainColor : subColor,\s*};\s*}\);\n', '\n', app)
app = re.sub(r'\s*const nextTexts = texts\.map\(\(t, idx\) => \{[\s\S]*?return \{ \.\.\.t, x: layoutText\.x, y: layoutText\.y, size: layoutText\.size \};\s*}\);\n', '\n', app)

# 7. Functions
app = re.sub(r'\s*\/\/ Texts\s*const addText = \(\) => \{[\s\S]*?if \(selectedId === id\) setSelectedId\(null\);\s*};\n', '\n', app)

# 8. onPointerDown
app = app.replace('kind: "text" | "logo" | "foreground",', 'kind: "logo" | "foreground",')
app = re.sub(r'\s*if \(kind === "text" && id\) \{[\s\S]*?\} else if \(kind === "logo" && logo\) \{', '\n    if (kind === "logo" && logo) {', app)
app = re.sub(r'\s*if \(dragRef\.current\.kind === "text" && dragRef\.current\.id\) \{[\s\S]*?\} else if \(dragRef\.current\.kind === "logo" && logo\) \{', '\n    if (dragRef.current.kind === "logo" && logo) {', app)

# 9. Canvas drawing
app = re.sub(r'\s*const wrapText = \([\s\S]*?return lines;\s*};\n', '\n', app)
app = re.sub(r'\s*\/\/\s*texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\s*}\);\n', '\n', app)

# 10. Property Panel UI
app = re.sub(r'\s*\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?\}\)\(\)\}\s*<\/div>\s*\)\}\n', '\n', app)

# 11. Menu UI
app = re.sub(r'\s*\{\/\* Texts \*\/\}\s*<div className="space-y-3">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<hr className="border-border\/60" \/>\n', '\n          <hr className="border-border/60" />\n', app)

# 12. Draggable UI
app = re.sub(r'\s*\{\/\* Draggable Texts with observer scaled font size \*\/\}\s*\{texts\.map\(\(t\) => \{[\s\S]*?<\/div>\s*\);\s*}\)\}\n', '\n', app)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)
print("done")
