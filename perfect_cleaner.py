import codecs

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    text = f.read()

# I will define the exact strings, precisely as they appear.

text = text.replace('TextItem, ', '')

s1 = """  const [texts, setTexts] = useState<TextItem[]>([
    {
      id: crypto.randomUUID(),
      text: "Seu resultado aqui",
      color: "#ffffff",
      size: 64,
      x: 0.5,
      y: 0.5,
      font: "inter",
    },
  ]);
"""
text = text.replace(s1, '')

text = text.replace('texts: undefined,\n', '')
text = text.replace('texts: [],\n', '')
text = text.replace('texts: state.texts,\n', '')
text = text.replace('      texts,\n', '')
text = text.replace('      texts: nextTexts,\n', '')
text = text.replace('logo, texts, format', 'logo, format')
text = text.replace('logo, texts }', 'logo }')
text = text.replace('setTexts, ', '')
text = text.replace(', setTexts ', ' ')

text = text.replace('getForegroundSpace(texts, logo, isStory)', 'getForegroundSpace(logo, isStory)')
text = text.replace('}, [foregrounds.length, format, texts.length, !!logo]);', '}, [foregrounds.length, format, !!logo]);')
text = text.replace('generateCohesiveLayout(format, foregrounds.length, texts.length, !!logo, presetIndex);', 'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex);')

text = text.replace('    let candidateTexts = [...texts];\n', '')
text = text.replace('    const candidateTexts = [...texts];\n', '')
text = text.replace('        candidateTexts = nextTexts;\n', '')
text = text.replace('    setTexts(candidateTexts);\n', '')

s2 = """      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)].id;
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
      });

"""
text = text.replace(s2, '')

s3 = """  // Texts
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
  };

"""
text = text.replace(s3, '')

text = text.replace('    kind: "text" | "logo" | "foreground",', '    kind: "logo" | "foreground",')

s4 = """    if (kind === "text" && id) {
      const item = texts.find((t) => t.id === id)!;
      cx = item.x * rect.width;
      cy = item.y * rect.height;
      setSelectedId(id);
    } else if (kind === "logo" && logo) {"""
text = text.replace(s4, '    if (kind === "logo" && logo) {')

s5 = """    if (dragRef.current.kind === "text" && dragRef.current.id) {
      updateText(dragRef.current.id, { x: cx, y: cy });
    } else if (dragRef.current.kind === "logo" && logo) {"""
text = text.replace(s5, '    if (dragRef.current.kind === "logo" && logo) {')

s6 = """    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
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
    };

"""
text = text.replace(s6, '')

s7 = """    // texts with font selection
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
    });

"""
text = text.replace(s7, '')

s8 = """            {texts.find((t) => t.id === selectedId) && (
              <div className="space-y-4 animate-fade-in p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-medium text-white/90">Editar Texto</h4>
                </div>
                {(() => {
                  const t = texts.find((t) => t.id === selectedId)!;
                  return (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Texto</Label>
                        <textarea
                          value={t.text}
                          onChange={(e) => updateText(t.id, { text: e.target.value })}
                          className="w-full bg-black/40 border-border/50 rounded-lg p-2 text-sm text-white resize-none h-20 focus:ring-1 focus:ring-primary/50 transition-all custom-scrollbar"
                          placeholder="Digite aqui..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Fonte</Label>
                          <Select
                            value={t.font || "inter"}
                            onValueChange={(val) => updateText(t.id, { font: val })}
                          >
                            <SelectTrigger className="h-8 bg-black/40 border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((f) => (
                                <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.family }}>
                                  {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Cor</Label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"].map((color) => (
                              <button
                                key={color}
                                onClick={() => updateText(t.id, { color })}
                                className={`w-6 h-6 rounded-full shrink-0 border-2 transition-transform ${t.color === color ? "border-primary scale-110" : "border-transparent hover:scale-105"}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-muted-foreground">Tamanho</Label>
                          <span className="text-[10px] text-muted-foreground">{t.size}px</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="200"
                          value={t.size}
                          onChange={(e) => updateText(t.id, { size: Number(e.target.value) })}
                          className="w-full accent-primary h-1.5 bg-muted/30 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
"""
text = text.replace(s8, '')

s9 = """          {/* Texts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/90 tracking-wide flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" /> Textos
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary transition-colors"
                onClick={addText}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            {texts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2 bg-black/20 rounded-lg border border-white/5">
                Nenhum texto adicionado.
              </p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                {texts.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm transition-all border ${selectedId === t.id ? "bg-primary/10 border-primary/30" : "bg-black/20 border-white/5 hover:bg-black/40"}`}
                  >
                    <button
                      className="flex-1 text-left truncate text-white/80 pr-2 hover:text-white"
                      onClick={() => setSelectedId(t.id)}
                    >
                      {t.text || `Texto ${idx + 1}`}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeText(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <hr className="border-border/60" />
"""
text = text.replace(s9, '          <hr className="border-border/60" />\n')

s10 = """            {/* Draggable Texts with observer scaled font size */}
            {texts.map((t) => {
              const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
              // dynamic sizing: t.size is relative to 1080p, so pxSize = t.size * (previewWidth / 1080)
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
            })}
"""
text = text.replace(s10, '')

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(text)

print('done')
