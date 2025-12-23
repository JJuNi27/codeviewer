// watch document changes + debounce
import * as vscode from "vscode";
import { debounce } from "../services/debounce";

export class DocumentWatcher {
  private disposables: vscode.Disposable[] = [];

  public start(onCodeChanged: (code: string) => void) {
    this.stop(); // 중복 등록 방지

    const emitCurrent = () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      onCodeChanged(editor.document.getText());
    };

    const emitCurrentDebounced = debounce(emitCurrent, 300);

    // 타이핑/편집 감지
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        emitCurrentDebounced();
      })
    );

    // 탭 전환 감지 (파일 바꾸면 바로 반영)
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        emitCurrent();
      })
    );

    // 시작하자마자 1번 반영
    emitCurrent();
  }

  public stop() {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
