"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelController = void 0;
const vscode = require("vscode");
const analyzeLite_1 = require("../services/analyzeLite");
class PanelController {
    createOrShow() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        this.panel = vscode.window.createWebviewPanel("codeVisualizer", "Code Visualizer", vscode.ViewColumn.Beside, { enableScripts: true });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
        this.panel.webview.html = this.wrapHtml(`
      <div style="font-family: ui-sans-serif, system-ui;">
        패널 열림 ✅ 이제 코드를 타이핑하면 여기에 실시간 반영될 거야.
      </div>
    `);
    }
    isOpen() {
        return !!this.panel;
    }
    updateWithCode(code) {
        if (!this.panel)
            return;
        const a = (0, analyzeLite_1.analyzeLite)(code);
        const tableHtml = this.renderLoopTable(a);
        const flowHtml = this.renderFlowchart(a);
        const gridHtml = this.renderGrid(a, code);
        const has2d = a.has2DArrayPattern ? "감지됨 ✅" : "아직 없음";
        const content = `
<div style="font-family: ui-sans-serif, system-ui; display: grid; gap: 12px;">
  <div style="display:flex; gap:10px; align-items:center;">
    <div style="font-weight:700;">시각화(라이트)</div>
    <div style="font-size:12px; color:#777;">※ 다음 단계에서 Python AST로 정확도 올릴 예정</div>
  </div>

  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div style="border:1px solid #ccc; border-radius:12px; padding:12px;">
      <div style="font-weight:700; margin-bottom:8px;">루프 표</div>
      ${tableHtml}
      <div style="margin-top:8px; font-size:12px; color:#555;">
        🧱 2차원 배열 생성 패턴: <b>${has2d}</b>
      </div>
    </div>

    <div style="border:1px solid #ccc; border-radius:12px; padding:12px;">
      <div style="font-weight:700; margin-bottom:8px;">흐름도</div>
      ${flowHtml}
    </div>
  </div>

  <div style="border:1px solid #ccc; border-radius:12px; padding:12px;">
    <div style="font-weight:700; margin-bottom:8px;">2차원 배열 격자</div>
    ${gridHtml}
  </div>

  <div style="border:1px solid #ccc; border-radius:12px; padding:12px;">
    <div style="font-weight:700; margin-bottom:8px;">현재 코드</div>
    <pre style="white-space: pre-wrap; margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${this.escapeHtml(code)}</pre>
  </div>
</div>
    `;
        this.panel.webview.html = this.wrapHtml(content);
    }
    renderLoopTable(a) {
        if (!a.loops.length) {
            return `<div style="color:#777; font-size:13px;">for문이 아직 없어요.</div>`;
        }
        const rows = a.loops
            .slice()
            .sort((x, y) => x.level - y.level)
            .map((loop) => {
            const role = loop.level === 1 ? "바깥(행 가능성↑)" :
                loop.level === 2 ? "안쪽(열 가능성↑)" :
                    `안쪽(${loop.level}단계)`;
            return `
<tr>
  <td style="padding:8px; border-top:1px solid #eee; text-align:center;">${loop.level}</td>
  <td style="padding:8px; border-top:1px solid #eee;"><b>${this.escapeHtml(loop.varName)}</b></td>
  <td style="padding:8px; border-top:1px solid #eee;">${this.escapeHtml(loop.iterExpr)}</td>
  <td style="padding:8px; border-top:1px solid #eee; color:#555;">${role}</td>
</tr>`;
        })
            .join("");
        return `
<table style="width:100%; border-collapse: collapse; font-size:13px;">
  <thead>
    <tr>
      <th style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">단계</th>
      <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">변수</th>
      <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">범위/대상</th>
      <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">역할(추정)</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
    }
    renderFlowchart(a) {
        if (!a.loops.length) {
            return `<div style="color:#777; font-size:13px;">흐름도를 만들 for문이 없어요.</div>`;
        }
        const loops = a.loops.slice().sort((x, y) => x.level - y.level).slice(0, 2);
        const w = 420;
        const boxW = 360;
        const boxH = 48;
        const startX = 30;
        const startY = 20;
        const gapY = 18;
        const boxes = loops.map((loop, idx) => {
            const y = startY + idx * (boxH + gapY);
            const title = `for ${loop.varName} in ${loop.iterExpr}`;
            return { x: startX, y, title };
        });
        const bodyY = startY + loops.length * (boxH + gapY);
        const body = { x: startX, y: bodyY, title: "body (반복되는 코드 블록)" };
        const svgBoxes = [...boxes, body]
            .map((b) => `
<rect x="${b.x}" y="${b.y}" width="${boxW}" height="${boxH}" rx="12" ry="12" fill="none" stroke="#bbb"/>
<text x="${b.x + 12}" y="${b.y + 30}" font-size="13" fill="#ddd" font-family="ui-monospace, monospace">${this.escapeHtml(b.title)}</text>
`)
            .join("");
        const arrows = [...boxes, body]
            .slice(0, -1)
            .map((b, i) => {
            const fromX = b.x + boxW / 2;
            const fromY = b.y + boxH;
            const toX = fromX;
            const toY = ([...boxes, body][i + 1].y);
            return `
<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="#888"/>
<polygon points="${toX - 5},${toY - 6} ${toX + 5},${toY - 6} ${toX},${toY}" fill="#888"/>`;
        })
            .join("");
        const loopBack = `
<path d="M ${startX + boxW} ${body.y + boxH / 2}
         C ${startX + boxW + 40} ${body.y + boxH / 2},
           ${startX + boxW + 40} ${startY + boxH / 2},
           ${startX + boxW} ${startY + boxH / 2}"
      stroke="#888" fill="none"/>
<polygon points="${startX + boxW - 2},${startY + boxH / 2 - 6} ${startX + boxW + 8},${startY + boxH / 2} ${startX + boxW - 2},${startY + boxH / 2 + 6}" fill="#888"/>`;
        const h = bodyY + boxH + 20;
        return `
<div style="border-radius:10px; overflow:hidden; background:#111; padding:8px;">
  <svg width="${w}" height="${h}">
    ${svgBoxes}
    ${arrows}
    ${loopBack}
  </svg>
  <div style="font-size:12px; color:#888; margin-top:6px;">
    ※ MVP: for 흐름만 도형으로 표시 (다음에 if 다이아몬드/분기 추가)
  </div>
</div>`;
    }
    /**
     * ✅ Grid MVP + A[i][j] 자동 하이라이트(가능하면 애니메이션)
     * - A = [[0]*M for _ in range(N)] 감지 → 격자 생성
     * - A[i][j] 감지 + i/j가 range(숫자)면 → 자동으로 칸이 순회 하이라이트(버튼 없음)
     */
    /**
   * ✅ Grid MVP + 값 누적 증가
   * - A = [[0]*M for _ in range(N)] 감지 → 격자 생성
   * - A[i][j] 감지 + i/j가 range(숫자)면 → 자동 순회하면서 값 누적 증가
   */
    renderGrid(a, code) {
        if (!a.grids.length) {
            return `<div style="color:#777; font-size:13px;">2차원 배열이 감지되지 않았어요. (예: A = [[0]*M for _ in range(N)])</div>`;
        }
        const g = a.grids[0];
        const maxPreview = 6;
        const rowsNum = /^\d+$/.test(g.rows) ? parseInt(g.rows, 10) : maxPreview;
        const colsNum = /^\d+$/.test(g.cols) ? parseInt(g.cols, 10) : maxPreview;
        const rows = Math.min(maxPreview, rowsNum);
        const cols = Math.min(maxPreview, colsNum);
        // access 중에서 이 격자 이름(A)과 같은 마지막 접근만 사용
        const access = a.cellAccesses.filter(x => x.arrayName === g.name).slice(-1)[0];
        // 애니메이션 가능 조건:
        // - A[i][j] 형태가 존재
        // - i, j가 각각 range(숫자)로 파악 가능
        let animRows;
        let animCols;
        if (access) {
            const r = a.loopRanges[access.rowIndex];
            const c = a.loopRanges[access.colIndex];
            if (typeof r === "number" && typeof c === "number") {
                animRows = Math.min(maxPreview, r);
                animCols = Math.min(maxPreview, c);
            }
        }
        // 셀 생성 (id 부여)
        let cells = "";
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                cells += `<div id="cv-cell-${i}-${j}" style="
        width:34px;
        height:34px;
        border:1px solid #bbb;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        background:#f9f9f9;
        border-radius:6px;
        transition: transform 120ms ease, outline 120ms ease, background 120ms ease;
      ">0</div>`;
            }
        }
        const accessInfo = access
            ? `<div style="margin-top:6px; font-size:12px; color:#555;">
         🔎 접근 감지: <b>${this.escapeHtml(access.raw)}</b>
       </div>`
            : `<div style="margin-top:6px; font-size:12px; color:#777;">
         (아직 A[i][j] 형태의 접근이 없어요)
       </div>`;
        // ✅ 값 누적 + 하이라이트 1칸만 유지
        const script = (animRows && animCols)
            ? `
<script>
(() => {
  const R = ${animRows};
  const C = ${animCols};
  let idx = 0;

  function clearHighlight() {
    for (let r=0; r<R; r++) for (let c=0; c<C; c++) {
      const el = document.getElementById(\`cv-cell-\${r}-\${c}\`);
      if (el) el.classList.remove("cv-highlight");
    }
  }

  function tick() {
    clearHighlight();

    const r = Math.floor(idx / C);
    const c = idx % C;

    const el = document.getElementById(\`cv-cell-\${r}-\${c}\`);
    if (el) {
      el.classList.add("cv-highlight");

      // ✅ 핵심: 값 누적 증가
      const v = parseInt(el.textContent || "0", 10);
      const OP = "${access?.op ?? ""}";

      if (OP === "+=") {
        el.textContent = String(v + 1);
        el.style.background = "#e9ffe9";
      }
      else if ("${access?.op}" === "-=") {
        el.textContent = String(v - 1);
        el.style.background = "#fff1e6";
      }
      else if ("${access?.op}" === "=") {
        el.textContent = "0";
        el.style.background = "#f0f0f0";
      }

    }

    idx = (idx + 1) % (R * C);
  }

  if (window.__cvTimer) clearInterval(window.__cvTimer);
  tick();
  window.__cvTimer = setInterval(tick, 350);
})();
</script>

<style>
  .cv-highlight {
    outline: 3px solid #7aa2ff;
    background: #e9f0ff !important;
    transform: scale(1.05);
  }
</style>
`
            : (access
                ? `<div style="margin-top:6px; font-size:12px; color:#777;">
             ※ 자동 순회/누적은 <code>for i in range(숫자)</code> / <code>for j in range(숫자)</code> 처럼 숫자가 파악될 때만 켜져요.
           </div>`
                : "");
        return `
<div style="margin-bottom:6px; font-size:13px;">
  <b>${this.escapeHtml(g.name)}</b> : ${this.escapeHtml(g.rows)} × ${this.escapeHtml(g.cols)} 배열
</div>

<div style="display:grid; grid-template-columns: repeat(${cols}, 34px); gap:4px;">
  ${cells}
</div>

<div style="margin-top:6px; font-size:12px; color:#777;">
  ※ 미리보기는 최대 ${maxPreview}×${maxPreview}까지만 표시
</div>

${accessInfo}
${script}
`;
    }
    wrapHtml(content) {
        return `<!doctype html>
<html>
  <body style="padding:12px;">
    <h3 style="font-family: ui-sans-serif, system-ui; margin: 0 0 10px 0;">Code Visualizer</h3>
    ${content}
  </body>
</html>`;
    }
    escapeHtml(s) {
        return s.replace(/[&<>"']/g, (m) => {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            };
            return map[m];
        });
    }
}
exports.PanelController = PanelController;
