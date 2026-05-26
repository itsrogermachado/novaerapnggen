import codecs
import re

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

app = app.replace('TextItem, ', '')
app = app.replace(' texts,\n', '\n')
app = app.replace(' texts: texts,\n', '\n')
app = app.replace(' texts: [],\n', '\n')
app = app.replace(' texts: undefined,\n', '\n')
app = app.replace('texts.length,\n', '')
app = app.replace('const layoutText = layout.texts[idx];\n        if (!layoutText) return t;\n        return { ...t, x: layoutText.x, y: layoutText.y, size: layoutText.size };', 'return t;')
app = app.replace('Partial<TextItem>', 'any')
app = re.sub(r'\s*texts: texts,', '', app)
app = re.sub(r'\s*texts: \[\],', '', app)
app = re.sub(r'\s*texts: undefined,', '', app)
app = re.sub(r'\s*texts,\n', '\n', app)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)

print("done")
