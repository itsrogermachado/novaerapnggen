import re

with open('src/routes/app.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Imports
code = re.sub(r'Format, TextItem, LibraryItem', 'Format, LibraryItem', code)
code = re.sub(r'ElementLayouts, CanvasState', 'ElementLayouts, CanvasState', code) # not matching, text is Format, TextItem, LibraryItem, Foreground, LogoState, CanvasState, ElementLayouts
code = code.replace("Format, TextItem, LibraryItem", "Format, LibraryItem")

# Remove texts state
state_pattern = r'const \[texts, setTexts\] = useState<TextItem\[\]>\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*text: "Seu resultado aqui",\s*color: "#ffffff",\s*size: 64,\s*x: 0\.5,\s*y: 0\.5,\s*font: "inter",\s*\},\s*\]\);'
code = re.sub(state_pattern, '', code)

# useCanvasHistory
code = code.replace("logo, texts, format", "logo, format")
code = code.replace("setLogo, setTexts, setFormat", "setLogo, setFormat")

# getForegroundSpace
code = code.replace("getForegroundSpace(texts, logo, isStory)", "getForegroundSpace(logo, isStory)")

# Effects dependencies
code = code.replace("foregrounds.length, format, texts.length, !!logo", "foregrounds.length, format, !!logo")

# candidateTexts
code = code.replace("let candidateTexts = [...texts];\n", "")
code = code.replace("texts: nextTexts,\n", "")

# generateCohesiveLayout
code = code.replace("""generateCohesiveLayout(
        format,
        foregrounds.length,
        texts.length,
        true, // force logo existence
        Math.floor(Math.random() * 3),
      )""", """generateCohesiveLayout(
        format,
        foregrounds.length,
        true, // force logo existence
        Math.floor(Math.random() * 3),
      )""")

# nextTexts loop
code = re.sub(r'const nextTexts = texts\.map\(\(t, idx\) => \{[^}]+\}\);\n', '', code, flags=re.MULTILINE)

# download function text rendering
text_render = r'// texts with font selection\s+texts\.forEach\(\(t\) => \{.*?\}\);\n'
code = re.sub(text_render, '', code, flags=re.DOTALL)

with open('src/routes/app.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Script executed.")
