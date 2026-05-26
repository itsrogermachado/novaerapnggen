import sys

with open('src/routes/app.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

if not lines[53].startswith('type Format'):
    print('Error: Line 54 is not type Format', repr(lines[53]))
    sys.exit(1)

imports = """import { Format, TextItem, LibraryItem, Foreground, LogoState, CanvasState, ElementLayouts } from "@/types/canvas";
import { FORMATS, FONTS, getForegroundSpace, getForegroundCoordinates, generateForegroundLayouts, generateCohesiveLayout } from "@/lib/layout-utils";
import { MiniCanvas } from "@/components/canvas/MiniCanvas";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import type { Database } from "@/integrations/supabase/types";
"""

new_lines = lines[:53] + [imports] + lines[108:118] + lines[565:]

with open('src/routes/app.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Successfully refactored imports and removed extracted code from app.tsx')
