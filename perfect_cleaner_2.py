import codecs
import re

with codecs.open('src/routes/app.tsx', 'r', 'utf-8') as f:
    text = f.read()

# 1. texts in CanvasState 
# Wait, CanvasState is: { bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format }
text = re.sub(r',\s*texts,\s*format', ', format', text)
text = re.sub(r'texts: undefined,\s*', '', text)
text = re.sub(r'texts:\s*\[\],\s*', '', text)
text = re.sub(r'texts: state\.texts,\s*', '', text)
text = re.sub(r'texts:\s*candidateTexts,\s*', '', text)
text = re.sub(r'texts:\s*nextTexts,\s*', '', text)
text = re.sub(r'texts:\s*\[\.\.\.texts\],\s*', '', text)
text = re.sub(r',\s*texts\b', '', text) # CAREFUL

# Let's be exact using str.replace
text = text.replace('  const [texts, setTexts] = useState<TextItem[]>([]);\n', '')
text = text.replace('    setTexts,\n', '')

text = text.replace('generateCohesiveLayout(format, foregrounds.length, texts.length, !!logo, presetIndex);', 'generateCohesiveLayout(format, foregrounds.length, !!logo, presetIndex);')

s_texts_canvasstate = '    const currentState: CanvasState = {\n      bgUrl,\n      bgUrlSigned,\n      bgImg,\n      foregrounds,\n      logo,\n      texts,\n      format,\n    };'
s_texts_canvasstate_clean = '    const currentState: CanvasState = {\n      bgUrl,\n      bgUrlSigned,\n      bgImg,\n      foregrounds,\n      logo,\n      format,\n    };'
text = text.replace(s_texts_canvasstate, s_texts_canvasstate_clean)

s_cand = '      const candidate: CanvasState = {\n        bgUrl: random.image_url,\n        bgUrlSigned: random.signed_url || random.image_url,\n        bgImg: null,\n        foregrounds,\n        logo,\n        texts,\n        format,\n      };'
s_cand_clean = '      const candidate: CanvasState = {\n        bgUrl: random.image_url,\n        bgUrlSigned: random.signed_url || random.image_url,\n        bgImg: null,\n        foregrounds,\n        logo,\n        format,\n      };'
text = text.replace(s_cand, s_cand_clean)

s_cand2 = '      const candidate: CanvasState = {\n        bgUrl,\n        bgUrlSigned,\n        bgImg: null,\n        foregrounds: candidateFgs,\n        logo,\n        texts,\n        format,\n      };'
s_cand2_clean = '      const candidate: CanvasState = {\n        bgUrl,\n        bgUrlSigned,\n        bgImg: null,\n        foregrounds: candidateFgs,\n        logo,\n        format,\n      };'
text = text.replace(s_cand2, s_cand2_clean)

s_cand3 = '      const candidate: CanvasState = {\n        bgUrl: nextBg,\n        bgUrlSigned: nextBgSigned,\n        bgImg: null,\n        foregrounds: nextFgs,\n        logo: nextLogo,\n        texts: nextTexts,\n        format,\n      };'
s_cand3_clean = '      const candidate: CanvasState = {\n        bgUrl: nextBg,\n        bgUrlSigned: nextBgSigned,\n        bgImg: null,\n        foregrounds: nextFgs,\n        logo: nextLogo,\n        format,\n      };'
text = text.replace(s_cand3, s_cand3_clean)

s_layout_text = '        const layoutText = layout.texts[idx];\n'
text = text.replace(s_layout_text, '')

s_update_text = '  const updateText = (id: string, patch: Partial<TextItem>) =>\n    setTexts((t) => t.map((it) => (it.id === id ? { ...it, ...patch } : it)));\n'
text = text.replace(s_update_text, '')

s_remove_text = '  const removeText = (id: string) => {\n    setTexts((t) => t.filter((it) => it.id !== id));\n    if (selectedId === id) setSelectedId(null);\n  };\n'
text = text.replace(s_remove_text, '')

s_add_text = '  const addText = () => {\n    const newId = crypto.randomUUID();\n    setTexts((t) => [\n      ...t,\n      { id: newId, text: "Novo texto", color: "#ffffff", size: 48, x: 0.5, y: 0.6, font: "inter" },\n    ]);\n    setSelectedId(newId);\n  };\n'
text = text.replace(s_add_text, '')

text = text.replace('// Texts\n', '')

text = text.replace(', setTexts', '')

s_kind = '    kind: "logo" | "foreground",\n'
text = text.replace('    kind: "text" | "logo" | "foreground",\n', s_kind)

s_if_kind = '    if (kind === "text" && id) {\n      const item = texts.find((t) => t.id === id)!;\n      cx = item.x * rect.width;\n      cy = item.y * rect.height;\n      setSelectedId(id);\n    } else if (kind === "logo" && logo) {'
s_if_kind_clean = '    if (kind === "logo" && logo) {'
text = text.replace(s_if_kind, s_if_kind_clean)

s_if_drag = '    if (dragRef.current.kind === "text" && dragRef.current.id) {\n      updateText(dragRef.current.id, { x: cx, y: cy });\n    } else if (dragRef.current.kind === "logo" && logo) {'
s_if_drag_clean = '    if (dragRef.current.kind === "logo" && logo) {'
text = text.replace(s_if_drag, s_if_drag_clean)

s_foreach = """    // texts with font selection
    texts.forEach((t) => {
      const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size * exportScale}px ${selectedFont.family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8 * exportScale;

      const lines = t.text.split("\\n");
      const lineH = t.size * exportScale * 1.15;
      const totalH = lineH * lines.length;
      lines.forEach((line, i) => {
        ctx.fillText(
          line,
          t.x * canvas.width,
          t.y * canvas.height - totalH / 2 + lineH / 2 + i * lineH,
        );
      });
    });
"""
text = text.replace(s_foreach, '')

text = re.sub(r'onPointerDown=\{\(e\) => onPointerDown\(e, "text", t\.id\)\}', '', text)

# one more attempt to remove `setTexts` entirely:
text = text.replace('setTexts,', '')

with codecs.open('src/routes/app.tsx', 'w', 'utf-8') as f:
    f.write(text)

print('done 2')
