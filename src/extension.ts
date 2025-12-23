import * as vscode from "vscode";
import { PanelController } from "./controllers/panelController";
import { DocumentWatcher } from "./controllers/documentWatcher";

let panelController: PanelController;
let watcher: DocumentWatcher;

export function activate(context: vscode.ExtensionContext) {
  panelController = new PanelController();
  watcher = new DocumentWatcher();

  const cmd = vscode.commands.registerCommand("code-visualizer.open", () => {
    panelController.createOrShow();

    // 패널이 열려있는 동안에만 업데이트
    watcher.start(
      (code) => {
        if (!panelController.isOpen()) return;
        panelController.updateWithCode(code);
      },
      (line) => {
        if (!panelController.isOpen()) return;
        panelController.setCursorLine(line);
      }
    );

  });

  context.subscriptions.push(cmd);

  // VS Code 종료/확장 비활성화 시 정리
  context.subscriptions.push({
    dispose: () => watcher.stop(),
  });
}

export function deactivate() {
  watcher?.stop();
}
