export type LiteLoop = {
  level: number;      // 1,2,3... (중첩 단계)
  varName: string;    // i, j ...
  iterExpr: string;   // range(N), arr, ...
  raw: string;        // 원본 for 라인(트러블슈팅용)
};

export type LiteAnalysis = {
  forDepth: number;
  loops: LiteLoop[];
  has2DArrayPattern: boolean;
};

export function analyzeLite(code: string): LiteAnalysis {
  const lines = code.split(/\r?\n/);

  const loops: LiteLoop[] = [];
  let maxLevel = 0;

  for (const line of lines) {
    const indent = (line.match(/^\s*/)?.[0].length ?? 0);
    const trimmed = line.trim();

    // for i in range(N):
    const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):\s*$/);
    if (m) {
      const varName = m[1];
      const iterExpr = m[2].trim();

      // 라이트 버전: 들여쓰기를 4칸 단위로 보고 level 추정
      const level = Math.floor(indent / 4) + 1;
      maxLevel = Math.max(maxLevel, level);

      loops.push({ level, varName, iterExpr, raw: trimmed });
    }
  }

  const has2DArrayPattern =
    /\[\s*\[.*\]\s*for\s+.*\s+in\s+range\(/.test(code) ||     // [[... ] for _ in range(N)]
    /\[\s*\[0\]\s*\*\s*\w+\s*for\s+.*\s+in\s+range\(/.test(code) || // [[0]*M for _ in range(N)]
    /\[\s*\[0\]\s*\*\s*\d+\s*for\s+.*\s+in\s+range\(/.test(code);

  return {
    forDepth: maxLevel,
    loops,
    has2DArrayPattern,
  };
}
