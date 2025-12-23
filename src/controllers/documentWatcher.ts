import * as vscode from "vscode";
import { debounce } from "../services/debounce";

export class DocumentWatcher {
  private disposables: vscode.Disposable[] = [];

  public start(
    onCodeChanged: (code: string) => void,
    onCursorLineChanged?: (line: number) => void
  ) {
    this.stop();

    const emitCurrent = () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      onCodeChanged(editor.document.getText());
    };

    const emitCursor = () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      onCursorLineChanged?.(editor.selection.active.line);
    };

    const debouncedEmit = debounce(() => emitCurrent(), 120);

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => debouncedEmit())
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        emitCurrent();
        emitCursor();
      })
    );

    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => emitCursor())
    );

    emitCurrent();
    emitCursor();
  }

  public stop() {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
