import * as vscode from "vscode";
import { analyzeLite } from "../services/analyzeLite";

export class PanelController {
  private panel: vscode.WebviewPanel | undefined;

  private cursorLine: number | undefined;
  private lastCode: string = "";

  public setCursorLine(line: number) {
    this.cursorLine = line;

    // ✅ 커서 이동 시에도 재렌더 (노란 강조 반영)
    if (this.panel && this.lastCode) {
      this.updateWithCode(this.lastCode);
    }
  }

  public createOrShow() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "codeVisualizer",
      "Code Visualizer",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.html = this.wrapHtml(`
      <div style="font-family: ui-sans-serif, system-ui;">
        <div style="font-weight:700; font-size:16px; margin-bottom:6px;">Code Visualizer</div>
        <div style="color:#777; font-size:13px;">
          패널 열림 ✅ 이제 코드를 타이핑/커서 이동하면 시각화가 갱신됩니다.
        </div>
      </div>
    `);
  }

  public isOpen() {
    return !!this.panel;
  }

  public updateWithCode(code: string) {
    if (!this.panel) return;

    this.lastCode = code;

    // analyzeLite의 반환 형태가 바뀌어도 MVP가 안 깨지도록 any 사용
    const a: any = analyzeLite(code) as any;

    const tableHtml = this.renderLoopTable(a);
    const flowHtml = this.renderFlowchart(a);
    const gridHtml = this.renderGrid(a, code, this.cursorLine);

    const has2d = a?.has2DArrayPattern ? "감지됨 ✅" : "아직 없음";

    const content = `
<div style="font-family: ui-sans-serif, system-ui; display: grid; gap: 12px;">
  <div style="display:flex; gap:10px; align-items:center;">
    <div style="font-weight:700;">시각화(라이트)</div>
    <div style="color:#777; font-size:12px;">※ 다음 단계에서 Python AST로 정확도 업</div>
  </div>

  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
    <div style="border:1px solid #333; border-radius:12px; padding:12px;">
      ${tableHtml}
      <div style="margin-top:8px; font-size:12px; color:#777;">
        🧱 2차원 배열 생성 패턴: <b>${has2d}</b>
      </div>
    </div>

    <div style="border:1px solid #333; border-radius:12px; padding:12px;">
      ${flowHtml}
    </div>
  </div>

  <div style="border:1px solid #333; border-radius:12px; padding:12px;">
    ${gridHtml}
  </div>

  <div style="border:1px solid #333; border-radius:12px; padding:12px;">
    <div style="margin-bottom:8px; font-weight:700;">현재 코드</div>
    <pre style="white-space: pre-wrap; margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${this.escapeHtml(code)}</pre>
  </div>
</div>
    `;

    this.panel.webview.html = this.wrapHtml(content);
  }

  // -------------------------
  // Render: Loop Table
  // -------------------------
  private renderLoopTable(a: any) {
    const loops = Array.isArray(a?.loops) ? a.loops : [];

    if (!loops.length) {
      return `<div style="color:#777; font-size:13px;">for문이 아직 없어요.</div>`;
    }

    const rows = loops
      .map((x: any, idx: number) => {
        const level = x.level ?? (idx + 1);
        const v = x.varName ?? "?";
        const it = x.iterExpr ?? "?";
        const role =
          idx === 0 ? "바깥(행 가능성↑)" : idx === 1 ? "안쪽(열 가능성↑)" : "내부";
        return `
<tr>
  <td style="padding:6px 8px; border-bottom:1px solid #222;">${level}</td>
  <td style="padding:6px 8px; border-bottom:1px solid #222;">${this.escapeHtml(String(v))}</td>
  <td style="padding:6px 8px; border-bottom:1px solid #222;">${this.escapeHtml(String(it))}</td>
  <td style="padding:6px 8px; border-bottom:1px solid #222; color:#888;">${role}</td>
</tr>`;
      })
      .join("");

    return `
<div style="font-weight:700; margin-bottom:8px;">루프 표</div>
<table style="width:100%; border-collapse: collapse; font-size:13px;">
  <thead>
    <tr>
      <th style="text-align:left; padding:6px 8px; border-bottom:1px solid #222;">단계</th>
      <th style="text-align:left; padding:6px 8px; border-bottom:1px solid #222;">변수</th>
      <th style="text-align:left; padding:6px 8px; border-bottom:1px solid #222;">범위/대상</th>
      <th style="text-align:left; padding:6px 8px; border-bottom:1px solid #222;">역할(추정)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
    `;
  }

  // -------------------------
  // Render: Flowchart
  // -------------------------
  private renderFlowchart(a: any) {
    const loops = Array.isArray(a?.loops) ? a.loops : [];
    if (!loops.length) {
      return `<div style="color:#777; font-size:13px;">흐름도를 만들 for문이 없어요.</div>`;
    }

    const boxes = loops
      .slice(0, 2)
      .map((x: any) => this.escapeHtml(x.raw ?? `for ${x.varName} in ${x.iterExpr}`));

    const outer = boxes[0] ?? "for ...";
    const inner = boxes[1] ?? "(내부 루프 없음)";

    return `
<div style="font-weight:700; margin-bottom:8px;">흐름도</div>
<div style="display:flex; flex-direction:column; gap:10px; align-items:center; font-size:13px;">
  <div style="width:90%; border:1px solid #444; border-radius:10px; padding:10px; text-align:center;">${outer}</div>
  <div style="width:0; height:16px; border-left:2px solid #444;"></div>
  <div style="width:90%; border:1px solid #444; border-radius:10px; padding:10px; text-align:center;">${inner}</div>
  <div style="width:0; height:16px; border-left:2px solid #444;"></div>
  <div style="width:90%; border:1px solid #444; border-radius:10px; padding:10px; text-align:center; color:#bbb;">
    body (반복되는 코드 블록)
  </div>
  <div style="margin-top:8px; font-size:12px; color:#777;">
    ※ MVP: for 흐름만 표시 (다음에 if 다이아몬드/분기 추가)
  </div>
</div>
    `;
  }

  // -------------------------
  // Render: Grid (2D)
  // -------------------------
  private renderGrid(a: any, code: string, cursorLine?: number) {
    const grids = Array.isArray(a?.grids) ? a.grids : [];
    if (!grids.length) {
      return `<div style="color:#777; font-size:13px;">2차원 배열이 감지되지 않았어요. (예: A = [[0]*M for _ in range(N)])</div>`;
    }

    const g = grids[0];
    const maxPreview = 6;

    const rowsNum = /^\d+$/.test(String(g.rows)) ? parseInt(String(g.rows), 10) : maxPreview;
    const colsNum = /^\d+$/.test(String(g.cols)) ? parseInt(String(g.cols), 10) : maxPreview;

    const rows = Math.min(maxPreview, rowsNum);
    const cols = Math.min(maxPreview, colsNum);

    // ✅ 항상 들어가야 하는 스타일 (핵심 수정)
    const baseStyle = `
<style>
  .cv-highlight{
    outline: 3px solid #7aa2ff;
    background: #e9f0ff !important;
    transform: scale(1.05);
  }
  .cv-cursor{
    outline: 3px solid #ffcc00 !important;
    background: #fff7d1 !important;
  }
</style>
    `;

    // 접근 정보: a.cellAccesses가 있는 경우만 사용
    const cellAccesses = Array.isArray(a?.cellAccesses) ? a.cellAccesses : [];

    // 커서 줄에서 A[숫자][숫자] 접근 찾기 (뒤에서부터)
    let cursorAccess: any | undefined = undefined;
    if (typeof cursorLine === "number") {
      for (let k = cellAccesses.length - 1; k >= 0; k--) {
        const x = cellAccesses[k];
        if (x?.arrayName === g.name && x?.line === cursorLine) {
          cursorAccess = x;
          break;
        }
      }
    }

    const cursorR =
      cursorAccess && /^\d+$/.test(String(cursorAccess.rowIndex))
        ? parseInt(String(cursorAccess.rowIndex), 10)
        : -1;
    const cursorC =
      cursorAccess && /^\d+$/.test(String(cursorAccess.colIndex))
        ? parseInt(String(cursorAccess.colIndex), 10)
        : -1;

    // 자동 순회(애니메이션) 가능한 조건: A[i][j] 형태 + i/j의 range(숫자) 파악 가능
    // (a.loopRanges가 없을 수도 있으니 안전하게)
    const loopRanges: Record<string, number> = a?.loopRanges ?? {};

    // "이 격자 이름"에 해당하는 접근 중 마지막 사용(루프 변수 접근일 때)
    const access = (() => {
      for (let k = cellAccesses.length - 1; k >= 0; k--) {
        const x = cellAccesses[k];
        if (x?.arrayName === g.name) return x;
      }
      return undefined;
    })();

    let animRows: number | undefined;
    let animCols: number | undefined;

    if (access) {
      const r = loopRanges[String(access.rowIndex)];
      const c = loopRanges[String(access.colIndex)];
      if (typeof r === "number" && typeof c === "number") {
        animRows = Math.min(maxPreview, r);
        animCols = Math.min(maxPreview, c);
      }
    }

    // 셀 생성 (id + cursor class)
    let cells = "";
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const isCursorCell = (i === cursorR && j === cursorC);

        cells += `<div id="cv-cell-${i}-${j}" class="${isCursorCell ? "cv-cursor" : ""}" style="
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

    // 애니메이션 스크립트(조건 충족 시에만)
    const animScript =
      (animRows && animCols)
        ? `
<script>
(() => {
  const R = ${animRows};
  const C = ${animCols};

  let idx = 0;

  function clearHighlight() {
    for (let r=0; r<R; r++) for (let c=0; c<C; c++) {
      const el = document.getElementById(\`cv-cell-\${r}-\${c}\`);
      if (!el) continue;
      el.classList.remove("cv-highlight");
    }
  }

  function tick() {
    clearHighlight();

    const r = Math.floor(idx / C);
    const c = idx % C;

    const el = document.getElementById(\`cv-cell-\${r}-\${c}\`);
    if (el) {
      el.classList.add("cv-highlight");

      // ✅ 값 누적 증가
      const v = parseInt(el.textContent || "0", 10);
      el.textContent = String(v + 1);
    }

    idx = (idx + 1) % (R * C);
  }

  if (window.__cvTimer) clearInterval(window.__cvTimer);
  tick();
  window.__cvTimer = setInterval(tick, 350);
})();
</script>
`
        : "";

    const accessInfo = cursorAccess
      ? `<div style="margin-top:6px; font-size:12px; color:#888;">
           🔎 커서 접근 감지: <code>${this.escapeHtml(String(cursorAccess.raw ?? ""))}</code>
         </div>`
      : `<div style="margin-top:6px; font-size:12px; color:#777;">
           ※ 커서 강조는 <code>A[1][2]</code> 처럼 숫자 인덱스를 썼을 때만 찍혀요. (<code>A[i][j]</code>는 다음 단계에서 지원)
         </div>`;

    const animHint = (!animScript)
      ? `<div style="margin-top:6px; font-size:12px; color:#777;">
           ※ 자동 순회/누적은 <code>for i in range(숫자)</code> / <code>for j in range(숫자)</code> 처럼 숫자가 파악될 때만 켜져요.
         </div>`
      : "";

    return `
<div style="display:grid; gap:10px;">
  <div style="font-size:13px;">
    <b>${this.escapeHtml(String(g.name))}</b> : ${this.escapeHtml(String(g.rows))} × ${this.escapeHtml(String(g.cols))} 배열
  </div>

  <div style="display:grid; grid-template-columns: repeat(${cols}, 34px); gap:4px;">
    ${cells}
  </div>

  <div style="font-size:12px; color:#777;">
    ※ 미리보기는 최대 ${maxPreview}×${maxPreview}까지만 표시
  </div>

  ${accessInfo}
  ${animHint}

  ${baseStyle}
  ${animScript}
</div>
    `;
  }

  private wrapHtml(content: string) {
    return `<!doctype html>
<html>
  <body style="padding:12px; color:#e6e6e6; background:#1e1e1e;">
    ${content}
  </body>
</html>`;
  }

  private escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => {
      const map: Record<string, string> = {
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
