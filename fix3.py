import re
import codecs

with codecs.open('src/lib/layout-utils.ts', 'r', 'utf-8') as f:
    layout = f.read()

layout = re.sub(r'TextItem, ', '', layout)

# generateCohesiveLayout texts part
layout = re.sub(r'texts: \[\],?\n?', '', layout)
# `if (numTexts > 0)` block 1
block1 = r'  if \(numTexts > 0\) \{\n    if \(preset === 0\) \{\n      const logoTopCenter = layout\.logo && Math\.abs\(layout\.logo\.x - 0\.5\) < 0\.05;\n      const startY = logoTopCenter \? \(isStory \? 0\.22 : 0\.2\) : isStory \? 0\.16 : 0\.14;\n      const spacing = isStory \? 0\.07 : 0\.06;\n\n      for \(let i = 0; i < numTexts; i\+\+\) \{\n        layout\.texts\.push\(\{\n          x: 0\.5,\n          y: startY \+ i \* spacing,\n          size: i === 0 \? \(isStory \? 56 : 48\) : isStory \? 38 : 32,\n        \}\);\n      \}\n    \} else if \(preset === 1\) \{\n      const startY = isStory \? 0\.82 : 0\.8;\n      const spacing = isStory \? 0\.07 : 0\.06;\n      for \(let i = 0; i < numTexts; i\+\+\) \{\n        layout\.texts\.push\(\{\n          x: 0\.5,\n          y: startY \+ i \* spacing,\n          size: i === 0 \? \(isStory \? 56 : 48\) : isStory \? 38 : 32,\n        \}\);\n      \}\n    \} else \{\n      for \(let i = 0; i < numTexts; i\+\+\) \{\n        if \(i === 0\) \{\n          layout\.texts\.push\(\{ x: 0\.5, y: isStory \? 0\.18 : 0\.16, size: isStory \? 54 : 46 \}\);\n        \} else if \(i === 1\) \{\n          layout\.texts\.push\(\{ x: 0\.5, y: isStory \? 0\.84 : 0\.82, size: isStory \? 48 : 40 \}\);\n        \} else \{\n          layout\.texts\.push\(\{ x: 0\.5, y: 0\.88 \+ \(i - 2\) \* 0\.05, size: 32 \}\);\n        \}\n      \}\n    \}\n  \}\n'
layout = re.sub(block1, '', layout)
# `if (numTexts > 0)` block 2
block2 = r'  if \(numTexts > 0\) \{\n    if \(preset === 0\) \{\n      const lastTextY = layout\.texts\[layout\.texts\.length - 1\]\.y;\n      fgMinY = Math\.max\(fgMinY, lastTextY \+ 0\.12\);\n    \} else if \(preset === 1\) \{\n      const firstTextY = layout\.texts\[0\]\.y;\n      fgMaxY = Math\.min\(fgMaxY, firstTextY - 0\.12\);\n    \} else \{\n      const topTextY = layout\.texts\[0\]\.y;\n      fgMinY = Math\.max\(fgMinY, topTextY \+ 0\.12\);\n      if \(layout\.texts\[1\]\) \{\n        fgMaxY = Math\.min\(fgMaxY, layout\.texts\[1\]\.y - 0\.12\);\n      \}\n    \}\n  \}\n'
layout = re.sub(block2, '', layout)
# layout.texts = layout.texts.map
block3 = r'  layout\.texts = layout\.texts\.map\(\(c\) => \(\{\n    x: Math\.max\(0\.05, Math\.min\(0\.95, c\.x\)\),\n    y: Math\.max\(0\.05, Math\.min\(0\.95, c\.y\)\),\n    size: Math\.max\(16, Math\.min\(200, c\.size\)\),\n  \}\)\);\n'
layout = re.sub(block3, '', layout)

# getStateSignature texts
block4 = r'  const txts = state\.texts\n    \.map\(\n      \(t\) =>\n        `\$\{t\.id\}:\$\{t\.text\}:\$\{t\.color\}:\$\{t\.size\}:\$\{t\.x\.toFixed\(3\)\}:\$\{t\.y\.toFixed\(3\)\}:\$\{t\.font \|\| "inter"\}`,\n    \)\n    \.sort\(\)\n    \.join\("\|"\);\n'
layout = re.sub(block4, '', layout)
layout = layout.replace('return `${bg}#${fgs}#${logoPart}#${txts}#${fmt}`;', 'return `${bg}#${fgs}#${logoPart}#${fmt}`;')

with codecs.open('src/lib/layout-utils.ts', 'w', 'utf-8') as f:
    f.write(layout)


with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

app = re.sub(r'TextItem, ', '', app)
app = re.sub(r'texts, format \} = currentState;', 'format } = currentState;', app)
app = re.sub(r'texts,\n\s+format,\n\s+\},\n\s+setters:', 'format,\n    },\n    setters:', app)
app = re.sub(r'setLogo, setTexts, setFormat', 'setLogo, setFormat', app)
app = re.sub(r'logo,\n\s*texts,\n\s*format,', 'logo,\n      format,', app)
app = re.sub(r'const layoutText = layout\.texts\[idx\];\n\s*if \(\!layoutText\) return t;\n\s*return \{ \.\.\.t, x: layoutText\.x, y: layoutText\.y, size: layoutText\.size \};\n\s*\}\);\n', '};\n', app)
app = re.sub(r'texts: nextTexts,\n\s*format,', 'format,', app)
app = re.sub(r'logo, texts, format', 'logo, format', app)

# There is a text wrap function maybe?
app = re.sub(r'const wrapText = \([\s\S]*?\n\s*return lines;\n\s*\};\n', '', app)
app = re.sub(r'\/\/ texts with font selection\n\s*texts\.forEach\(\(t\) => \{[\s\S]*?\}\);\n', '', app)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)

print("done")
