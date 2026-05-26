import codecs
import re

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    text = f.read()

# 1. remove import TextItem
text = re.sub(r'TextItem,\s*', '', text)

# 2. remove texts useState block
text = re.sub(r'\s*const \[texts, setTexts\] = useState<TextItem\[\]>\(\[[\s\S]*?\]\);', '', text)

# 3. CanvasState types
text = re.sub(r',\s*texts\b', '', text)
text = re.sub(r'\btexts,\s*', '', text)
text = re.sub(r'texts:\s*[^,]+,', '', text)
text = re.sub(r',\s*texts:\s*[^}]+', '', text)

# 4. functions calls
text = text.replace('getForegroundSpace(texts, logo, isStory)', 'getForegroundSpace(logo, isStory)')
text = text.replace('generateCohesiveLayout(format, foregrounds.length, texts.length, !!logo, presetIndex)', 'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex)')
text = text.replace('[foregrounds.length, format, texts.length, !!logo]', '[foregrounds.length, format, !!logo]')

# 5. randomize block texts variables
text = re.sub(r'\s*let candidateTexts = \[\.\.\.texts\];', '', text)
text = re.sub(r'\s*candidateTexts = nextTexts;', '', text)
text = re.sub(r'\s*setTexts\(candidateTexts\);', '', text)

# 6. texts nextTexts mapping
text = re.sub(r'\s*const randomFont = FONTS\[Math\.floor[\s\S]*?\}\);', '', text)

# 7. text methods
text = re.sub(r'\s*\/\/ Texts[\s\S]*?setSelectedId\(null\);\n\s*};', '', text)

# 8. pointers
text = text.replace('kind: "text" | "logo" | "foreground"', 'kind: "logo" | "foreground"')
text = re.sub(r'\s*if \(kind === "text" && id\) \{[\s\S]*?\} else if \(kind === "logo" && logo\) \{', '\n    if (kind === "logo" && logo) {', text)
text = re.sub(r'\s*if \(dragRef\.current\.kind === "text" && dragRef\.current\.id\) \{[\s\S]*?\} else if \(dragRef\.current\.kind === "logo" && logo\) \{', '\n    if (dragRef.current.kind === "logo" && logo) {', text)

# 9. download logic
text = re.sub(r'\s*const wrapText = \(ctx: CanvasRenderingContext2D[\s\S]*?return lines;\n\s*};', '', text)
text = re.sub(r'\s*\/\/ texts with font selection[\s\S]*?ctx\.shadowColor = "transparent";\n\s*}\);', '', text)

# 10. UI 
text = re.sub(r'\s*\{\/\* Texts \*\/\}\s*<div className="space-y-3">[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<hr className="border-border\/60" \/>', '\n          <hr className="border-border/60" />', text)
text = re.sub(r'\s*\{texts\.find\(\(t\) => t\.id === selectedId\) && \([\s\S]*?<\/div>\s*\)\}', '', text)
text = re.sub(r'\s*\{\/\* Draggable Texts with observer scaled font size \*\/\}\s*\{texts\.map\(\(t\) => \{[\s\S]*?<\/div>\s*\);\s*}\)\}', '', text)

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(text)
print('done')
