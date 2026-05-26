import sys

with open('src/routes/app.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

hook_call = """  const { past, future, setPast, setFuture, saveToHistory, undo, redo, goToHistoryState } = useCanvasHistory({
    currentState: { bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format },
    setters: { setBgUrl, setBgUrlSigned, setBgImg, setForegrounds, setLogo, setTexts, setFormat, setSelectedId }
  });
"""

new_lines = []
skip = False
i = 0
while i < len(lines):
    line = lines[i]
    if '// History Undo/Redo States' in line:
        new_lines.append(line)
        new_lines.append(hook_call)
        i += 2
    elif 'const getStateSignature = ' in line:
        skip = True
    elif skip and '};' in line and lines[i-1].strip() == 'return `${bg}#${fgs}#${logoPart}#${txts}#${fmt}`;':
        skip = False
    elif 'const saveToHistory = useCallback(() => {' in line:
        skip = True
    elif skip and '}, [bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);' in line:
        skip = False
    elif 'const undo = useCallback(() => {' in line:
        skip = True
    elif skip and '}, [past, bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);' in line:
        skip = False
    elif 'const redo = useCallback(() => {' in line:
        skip = True
    elif skip and '}, [future, bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);' in line:
        skip = False
    elif 'const goToHistoryState = useCallback((targetState: CanvasState, index: number, type: ' in line and '"past" | "future"' in line:
        skip = True
    elif skip and '}, [past, future, bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);' in line:
        skip = False
    elif 'const handleKeyDown = (e: KeyboardEvent) => {' in line and lines[i-1].strip() == 'useEffect(() => {':
        new_lines.pop()
        skip = True
    elif skip and '}, [undo, redo]);' in line:
        skip = False
    else:
        if not skip:
            new_lines.append(line)
    i += 1

with open('src/routes/app.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Successfully applied history refactoring script!')
