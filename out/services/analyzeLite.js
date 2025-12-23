"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeLite = analyzeLite;
/**
 * ⚠️ Lite 분석기(임시):
 * - 정확한 파이썬 해석이 목적이 아니라 "시각화 MVP"를 위한 패턴 기반 분석기
 * - 다음 단계에서 Python AST로 교체 예정
 */
function analyzeLite(code) {
    const lines = code.split(/\r?\n/);
    // 1) for 루프 수집(들여쓰기 기반으로 level 추정)
    const loops = [];
    let maxLevel = 0;
    for (const line of lines) {
        const indent = (line.match(/^\s*/)?.[0].length ?? 0);
        const trimmed = line.trim();
        // for i in range(N):
        const m = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):\s*$/);
        if (!m)
            continue;
        const varName = m[1];
        const iterExpr = m[2].trim();
        // 라이트 버전: 들여쓰기 4칸 = 1단계로 가정
        const level = Math.floor(indent / 4) + 1;
        maxLevel = Math.max(maxLevel, level);
        loops.push({ level, varName, iterExpr, raw: trimmed });
    }
    // 2) 2차원 배열 생성 패턴 감지(라이트)
    const has2DArrayPattern = /\[\s*\[.*\]\s*for\s+.*\s+in\s+range\(/.test(code) || // [[... ] for _ in range(N)]
        /\[\s*\[0\]\s*\*\s*[A-Za-z_]\w*\s*for\s+.*\s+in\s+range\(/.test(code) || // [[0]*M for _ in range(N)]
        /\[\s*\[0\]\s*\*\s*\d+\s*for\s+.*\s+in\s+range\(/.test(code); // [[0]*3 for _ in range(2)]
    // 3) 격자(Grid) 감지: A = [[0]*M for _ in range(N)]
    //    rows=N, cols=M 추정
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
    return {
        forDepth: maxLevel,
        loops,
        has2DArrayPattern,
        grids,
    };
}
