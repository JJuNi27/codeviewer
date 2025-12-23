export type LiteLoop = {
  level: number;
  varName: string;
  iterExpr: string;
  raw: string;
};

export type LiteGrid = {
  name: string;
  rows: string;
  cols: string;
  raw: string;
};

export type LiteCellAccess = {
  arrayName: string;
  rowIndex: string;
  colIndex: string;
  op: "+=" | "-=" | "=";
  raw: string;
  line: number; // 0-based
};

export type LiteAnalysis = {
  forDepth: number;
  loops: LiteLoop[];
  loopRanges: Record<string, number>;
  has2DArrayPattern: boolean;
  grids: LiteGrid[];
  cellAccesses: LiteCellAccess[];
};

function parseRangeLiteral(expr: string): number | undefined {
  const m = expr.match(/^range\(\s*(\d+)\s*\)$/);
  if (!m) return undefined;
  return parseInt(m[1], 10);
}

export function analyzeLite(code: string): LiteAnalysis {
  const lines = code.split(/\r?\n/);

  // for 수집
  const loops: LiteLoop[] = [];
  let maxLevel = 0;

  for (const line of lines) {
    const indent = (line.match(/^\s*/)?.[0].length ?? 0);
    const trimmed = line.trim();

    const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):\s*$/);
    if (!m) continue;

    const varName = m[1];
    const iterExpr = m[2].trim();
    const level = Math.floor(indent / 4) + 1;

    maxLevel = Math.max(maxLevel, level);
    loops.push({ level, varName, iterExpr, raw: trimmed });
  }

  // var -> range(숫자)
  const loopRanges: Record<string, number> = {};
  for (const loop of loops) {
    const n = parseRangeLiteral(loop.iterExpr);
    if (typeof n === "number") loopRanges[loop.varName] = n;
  }

  const has2DArrayPattern =
    /\[\s*\[.*\]\s*for\s+.*\s+in\s+range\(/.test(code) ||
    /\[\s*\[0\]\s*\*\s*[A-Za-z_]\w*\s*for\s+.*\s+in\s+range\(/.test(code) ||
    /\[\s*\[0\]\s*\*\s*\d+\s*for\s+.*\s+in\s+range\(/.test(code);

  // A = [[0]*M for _ in range(N)]
  const grids: LiteGrid[] = [];
  const gridRegex =
    /([A-Za-z_]\w*)\s*=\s*\[\s*\[\s*0\s*\]\s*\*\s*([A-Za-z_]\w*|\d+)\s*for\s+.*?\s+in\s+range\(\s*([A-Za-z_]\w*|\d+)\s*\)\s*\]/;

  const gm = code.match(gridRegex);
  if (gm) {
    grids.push({
      name: gm[1],
      cols: gm[2],
      rows: gm[3],
      raw: gm[0],
    });
  }

  // A[i][j] += 1 / -= 1 / = 0 (라인번호 포함)
  const cellAccesses: LiteCellAccess[] = [];
  const accessRegex =
    /([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]\s*(\+=|-=|=)\s*(\d+)/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(accessRegex);
    if (!m) continue;

    cellAccesses.push({
      arrayName: m[1],
      rowIndex: m[2],
      colIndex: m[3],
      op: m[4] as "+=" | "-=" | "=",
      raw: m[0],
      line: i,
    });
  }

  return {
    forDepth: maxLevel,
    loops,
    loopRanges,
    has2DArrayPattern,
    grids,
    cellAccesses,
  };
}
