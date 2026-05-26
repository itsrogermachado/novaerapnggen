import codecs

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

# 1. 178,38: Cannot find name 'TextItem'
app = app.replace('TextItem, ', '')

# 2. 714,9: Expected 4 arguments, but got 5
old_gen = '''      const layout = generateCohesiveLayout(
        format,
        foregrounds.length,
        texts.length,
        !!logo,
        presetIndex
      );'''
new_gen = '''      const layout = generateCohesiveLayout(
        format,
        foregrounds.length,
        !!logo,
        presetIndex
      );'''
app = app.replace(old_gen, new_gen)

# 3. 747,35: Property 'texts' does not exist on type 'ElementLayouts'
old_next_texts = '''      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)].id;
      const highlightColors = ["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];
      const mainColor = highlightColors[Math.floor(Math.random() * highlightColors.length)];
      const subColor = mainColor === "#ffffff" ? highlightColors[Math.floor(1 + Math.random() * (highlightColors.length - 1))] : "#ffffff";

      const nextTexts = texts.map((t, idx) => {
        const layoutText = layout.texts[idx];
        return {
          ...t,
          x: layoutText?.x ?? t.x,
          y: layoutText?.y ?? t.y,
          size: layoutText?.size ?? t.size,
          font: randomFont,
          color: idx === 0 ? mainColor : subColor,
        };
      });'''
app = app.replace(old_next_texts, '')

app = app.replace('texts: nextTexts,', '')

# 4. 557, 578, 612, 652, 681, 764: Property texts does not exist in type CanvasState
app = app.replace('texts: undefined,\n', '')
app = app.replace('texts: [],\n', '')
app = app.replace('texts,\n', '')
app = app.replace('texts: state.texts,\n', '')

# 5. wrapText and texts.forEach
old_wrap = '''    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };'''
app = app.replace(old_wrap, '')

old_draw = '''    // texts with font selection
    texts.forEach((t) => {
      const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
      
      const pxX = t.x * outW;
      const pxY = t.y * outH;
      const pxSize = (t.size * exportScale * outW) / 1080; // Scale relative to width

      // Use a bolder weight for export to match preview
      ctx.font = `bold ${pxSize}px ${selectedFont.family.replace(/['"]/g, '')}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = t.color;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 4 * exportScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * exportScale;

      const lines = wrapText(ctx, t.text, outW * 0.9); // max 90% width
      const lineHeight = pxSize * 1.15;
      const totalHeight = lines.length * lineHeight;
      let startY = pxY - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line) => {
        ctx.fillText(line, pxX, startY);
        startY += lineHeight;
      });

      ctx.shadowColor = "transparent";
    });'''
app = app.replace(old_draw, '')


with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)

print("done")
