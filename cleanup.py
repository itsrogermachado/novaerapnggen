import codecs

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    app = f.read()

app = app.replace('TextItem, ', '')

texts_state = '''  const [texts, setTexts] = useState<TextItem[]>([
    {
      id: crypto.randomUUID(),
      text: "Seu resultado aqui",
      color: "#ffffff",
      size: 64,
      x: 0.5,
      y: 0.5,
      font: "inter",
    },
  ]);\n'''
app = app.replace(texts_state, '')

history1 = '''    currentState: { bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format },
    setters: { setBgUrl, setBgUrlSigned, setBgImg, setForegrounds, setLogo, setTexts, setFormat, setSelectedId }'''
history2 = '''    currentState: { bgUrl, bgUrlSigned, bgImg, foregrounds, logo, format },
    setters: { setBgUrl, setBgUrlSigned, setBgImg, setForegrounds, setLogo, setFormat, setSelectedId }'''
app = app.replace(history1, history2)

app = app.replace('const { fgMinY, fgMaxY } = getForegroundSpace(texts, logo, isStory);', 
                  'const { fgMinY, fgMaxY } = getForegroundSpace(logo, isStory);')

app = app.replace('}, [foregrounds.length, format, texts.length, !!logo]);',
                  '}, [foregrounds.length, format, !!logo]);')

app = app.replace('      texts,\n', '')
app = app.replace('      texts: state.texts,\n', '')
app = app.replace('      texts: undefined,\n', '')
app = app.replace('      texts: [],\n', '')
app = app.replace('texts: nextTexts,', '')

gen1 = '''      const layout = generateCohesiveLayout(
        format,
        foregrounds.length,
        texts.length,
        !!logo,
        presetIndex
      );'''
gen2 = '''      const layout = generateCohesiveLayout(
        format,
        foregrounds.length,
        !!logo,
        presetIndex
      );'''
app = app.replace(gen1, gen2)

cand1 = '''      candidateTexts = nextTexts;'''
app = app.replace(cand1, '')

cand2 = '''    let candidateTexts = [...texts];\n'''
app = app.replace(cand2, '')

next_texts = '''      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)].id;
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
app = app.replace(next_texts, '')

next_texts_2 = '''      const nextTexts = texts.map((t, idx) => {
        const layoutText = layout.texts[idx];
        if (!layoutText) return t;
        return { ...t, x: layoutText.x, y: layoutText.y, size: layoutText.size };
      });'''
app = app.replace(next_texts_2, '')

funcs = '''  // Texts
  const addText = () => {
    const newId = crypto.randomUUID();
    setTexts((t) => [
      ...t,
      { id: newId, text: "Novo texto", color: "#ffffff", size: 48, x: 0.5, y: 0.6, font: "inter" },
    ]);
    setSelectedId(newId);
  };

  const updateText = (id: string, patch: Partial<TextItem>) =>
    setTexts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );

  const removeText = (id: string) => {
    setTexts((t) => t.filter((it) => it.id !== id));
    if (selectedId === id) setSelectedId(null);
  };'''
app = app.replace(funcs, '')

pd1 = '''    kind: "text" | "logo" | "foreground",
    id?: string,
  ) => {
    saveToHistory();
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    let cx = 0,
      cy = 0;

    if (kind === "text" && id) {
      const item = texts.find((t) => t.id === id)!;
      cx = item.x * rect.width;
      cy = item.y * rect.height;
      setSelectedId(id);
    } else if (kind === "logo" && logo) {'''
pd2 = '''    kind: "logo" | "foreground",
    id?: string,
  ) => {
    saveToHistory();
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    let cx = 0,
      cy = 0;

    if (kind === "logo" && logo) {'''
app = app.replace(pd1, pd2)

wrap_text = '''    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
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
app = app.replace(wrap_text, '')

draw_texts = '''    // texts with font selection
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
app = app.replace(draw_texts, '')

texts_panel = '''              {texts.find((t) => t.id === selectedId) && (
                <div className="space-y-3">
                  {(() => {
                    const txtItem = texts.find((t) => t.id === selectedId)!;
                    return (
                      <>
                        <textarea
                          className="w-full text-xs font-medium border border-border/80 rounded-xl p-2.5 bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-transparent focus-visible:outline-none transition-all"
                          rows={2}
                          value={txtItem.text}
                          onFocus={() => saveToHistory()}
                          onChange={(e) => updateText(selectedId, { text: e.target.value })}
                        />
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            value={txtItem.color}
                            onPointerDown={() => saveToHistory()}
                            onChange={(e) => updateText(selectedId, { color: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-border/80 p-0.5 bg-background"
                          />
                          <div className="flex-1">
                            <Select
                              value={txtItem.font || "inter"}
                              onValueChange={(val) => {
                                saveToHistory();
                                updateText(selectedId, { font: val });
                              }}
                            >
                              <SelectTrigger className="bg-background border-border text-xs rounded-xl h-8">
                                <SelectValue placeholder="Fonte" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border text-foreground">
                                {FONTS.map((f) => (
                                  <SelectItem
                                    key={f.id}
                                    value={f.id}
                                    style={{ fontFamily: f.family }}
                                  >
                                    {f.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={16}
                            max={200}
                            value={txtItem.size}
                            onPointerDown={() => saveToHistory()}
                            onChange={(e) => updateText(selectedId, { size: +e.target.value })}
                            className="w-full accent-primary h-1.5 bg-background rounded-lg cursor-pointer"
                          />
                          <div className="text-[10px] text-muted-foreground font-bold">
                            Tamanho: {txtItem.size}px
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}'''
app = app.replace(texts_panel, '')

texts_menu = '''          {/* Texts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Textos
                </Label>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  saveToHistory();
                  addText();
                }}
                className="border-border hover:border-primary/30 hover:bg-accent rounded-xl font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {texts.length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-4 text-center bg-muted/10">
                <p className="text-[11px] text-muted-foreground">
                  Nenhum texto no canvas. Adicione um acima.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {texts.map((t) => (
                  <div
                    key={t.id}
                    className={`border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all bg-background/40 hover:bg-background/60 shadow-sm cursor-pointer ${selectedId === t.id ? "ring-2 ring-primary border-transparent" : "border-border/85"}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span className="text-xs font-semibold truncate flex-1 pr-2">
                      {t.text || "(Texto vazio)"}
                    </span>
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: t.color }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />'''
app = app.replace(texts_menu, '')

draggable = '''            {/* Draggable Texts with observer scaled font size */}
            {texts.map((t) => {
              const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
              const scaledSize = (t.size * previewWidth) / 1080;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onPointerDown(e, "text", t.id)}
                  style={{
                    position: "absolute",
                    left: `${t.x * 100}%`,
                    top: `${t.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    color: t.color,
                    fontSize: `${scaledSize}px`,
                    fontFamily: selectedFont.family,
                    fontWeight: 700,
                    textAlign: "center",
                    whiteSpace: "pre-wrap",
                    textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                    cursor: "grab",
                    lineHeight: 1.15,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  className={
                    selectedId === t.id
                      ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80 animate-pulse duration-[1500ms]"
                      : ""
                  }
                >
                  {t.text}
                </div>
              );
            })}'''
app = app.replace(draggable, '')

app = app.replace('state={{ bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format }}',
                  'state={{ bgUrl, bgUrlSigned, bgImg, foregrounds, logo, format }}')

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(app)
