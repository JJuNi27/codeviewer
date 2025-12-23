"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeLite = analyzeLite;
function parseRangeLiteral(expr) {
    // range(3) / range(  3  )
    const m = expr.match(/^range\(\s*(\d+)\s*\)$/);
    if (!m)
        return undefined;
    return parseInt(m[1], 10);
}
function analyzeLite(code) {
    const lines = code.split(/\r?\n/);
    // 1) for 루프 수집
    const loops = [];
    let maxLevel = 0;
    for (const line of lines) {
        const indent = (line.match(/^\s*/)?.[0].length ?? 0);
        const trimmed = line.trim();
        const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):\s*$/);
        if (!m)
            continue;
        const varName = m[1];
        const iterExpr = m[2].trim();
        const level = Math.floor(indent / 4) + 1;
        maxLevel = Math.max(maxLevel, level);
        loops.push({ level, varName, iterExpr, raw: trimmed });
    }
    // 1-1) var -> range 숫자 매핑(가능하면)
    const loopRanges = {};
    for (const loop of loops) {
        const n = parseRangeLiteral(loop.iterExpr);
        if (typeof n === "number")
            loopRanges[loop.varName] = n;
    }
    // 2) 2차원 배열 생성 패턴(라이트)
    const has2DArrayPattern = /\[\s*\[.*\]\s*for\s+.*\s+in\s+range\(/.test(code) ||
        /\[\s*\[0\]\s*\*\s*[A-Za-z_]\w*\s*for\s+.*\s+in\s+range\(/.test(code) ||
        /\[\s*\[0\]\s*\*\s*\d+\s*for\s+.*\s+in\s+range\(/.test(code);
    // 3) 격자(Grid) 감지: A = [[0]*M for _ in range(N)]
    const grids = [];
    const gridRegex = /([A-Za-z_]\w*)\s*=\s*\[\s*\[\s*0\s*\]\s*\*\s*([A-Za-z_]\w*|\d+)\s*for\s+.*?\s+in\s+range\(\s*([A-Za-z_]\w*|\d+)\s*\)\s*\]/;
    const gm = code.match(gridRegex);
    if (gm) {
        grids.push({
            name: gm[1],
            cols: gm[2],
            rows: gm[3],
            raw: gm[0],
        });
    }
    // 4) ✅ A[i][j] 감지 (배열 접근 패턴)
    // - 너무 욕심부리면 오탐 많아져서 MVP는 "가장 흔한" 패턴만 잡음
    const cellAccesses = [];
    const accessRegex = /([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]\s*(\+=|-=|=)\s*(\d+)/g;
    let match;
    while ((match = accessRegex.exec(code)) !== null) {
        cellAccesses.push({
            arrayName: match[1],
            rowIndex: match[2],
            colIndex: match[3],
            op: match[4],
            raw: match[0], // 예: A[i][j] += 1
        });
    }
    return {
        forDepth: maxLevel,
        loops,
        has2DArrayPattern,
        grids,
        cellAccesses,
        loopRanges,
    };
}
