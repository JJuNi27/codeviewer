import * as vscode from "vscode";
import { analyzeLite } from "../services/analyzeLite";

export class PanelController {
  private panel: vscode.WebviewPanel | undefined;

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
        패널 열림 ✅ 이제 코드를 타이핑하면 여기에 실시간 반영될 거야.
      </div>
    `);
  }

  public isOpen() {
    return !!this.panel;
  }

  public updateWithCode(code: string) {
    if (!this.panel) return;

    // ✅ 먼저 분석 결과를 만들고
    const a = analyzeLite(code);

    // ✅ 그 다음에 각각의 시각화 조각을 만든다
    const tableHtml = this.renderLoopTable(a);
    const flowHtml = this.renderFlowchart(a);
    const gridHtml = this.renderGrid(a);

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

  private renderLoopTable(a: ReturnType<typeof analyzeLite>) {
    if (!a.loops.length) {
      return `<div style="color:#777; font-size:13px;">for문이 아직 없어요.</div>`;
    }

    const rows = a.loops
      .slice()
      .sort((x, y) => x.level - y.level)
      .map((loop) => {
        const role =
          loop.level === 1 ? "바깥(행 가능성↑)" :
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

  private renderFlowchart(a: ReturnType<typeof analyzeLite>) {
    if (!a.loops.length) {
      return `<div style="color:#777; font-size:13px;">흐름도를 만들 for문이 없어요.</div>`;
    }

    // MVP: 1~2단계까지만 그림
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
      .map(
        (b) => `
<rect x="${b.x}" y="${b.y}" width="${boxW}" height="${boxH}" rx="12" ry="12" fill="none" stroke="#bbb"/>
<text x="${b.x + 12}" y="${b.y + 30}" font-size="13" fill="#ddd" font-family="ui-monospace, monospace">${this.escapeHtml(
          b.title
        )}</text>
`
      )
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
   * 격자(Grid) MVP
   * - A = [[0]*M for _ in range(N)] 패턴이 있으면 N×M 격자(미리보기) 출력
   * - N/M이 숫자면 그 크기 근처로, 변수면 최대 preview로 표시
   */
  private renderGrid(a: ReturnType<typeof analyzeLite>) {
    if (!a.grids.length) {
      return `<div style="color:#777; font-size:13px;">2차원 배열이 감지되지 않았어요. (예: A = [[0]*M for _ in range(N)])</div>`;
    }

    const g = a.grids[0];
    const maxPreview = 6;

    const rowsNum = /^\d+$/.test(g.rows) ? parseInt(g.rows, 10) : maxPreview;
    const colsNum = /^\d+$/.test(g.cols) ? parseInt(g.cols, 10) : maxPreview;

    const rows = Math.min(maxPreview, rowsNum);
    const cols = Math.min(maxPreview, colsNum);

    let cells = "";
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        cells += `<div style="
          width:34px;
          height:34px;
          border:1px solid #bbb;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:12px;
          background:#f9f9f9;
          border-radius:6px;
        ">0</div>`;
      }
    }

    return `
<div style="margin-bottom:6px; font-size:13px;">
  <b>${this.escapeHtml(g.name)}</b> : ${this.escapeHtml(g.rows)} × ${this.escapeHtml(g.cols)} 배열
</div>

<div style="display:grid; grid-template-columns: repeat(${cols}, 34px); gap:4px;">
  ${cells}
</div>

<div style="margin-top:6px; font-size:12px; color:#777;">
  ※ 미리보기는 최대 ${maxPreview}×${maxPreview}까지만 표시
</div>`;
  }

  private wrapHtml(content: string) {
    return `<!doctype html>
<html>
  <body style="padding:12px;">
    <h3 style="font-family: ui-sans-serif, system-ui; margin: 0 0 10px 0;">Code Visualizer</h3>
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
