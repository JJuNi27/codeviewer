"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const panelController_1 = require("./controllers/panelController");
const documentWatcher_1 = require("./controllers/documentWatcher");
let panelController;
let watcher;
function activate(context) {
    panelController = new panelController_1.PanelController();
    watcher = new documentWatcher_1.DocumentWatcher();
    const cmd = vscode.commands.registerCommand("code-visualizer.open", () => {
        panelController.createOrShow();
        // 패널이 열려있는 동안에만 업데이트
        watcher.start((code) => {
            if (!panelController.isOpen())
                return;
            panelController.updateWithCode(code);
        });
    });
    context.subscriptions.push(cmd);
    // VS Code 종료/확장 비활성화 시 정리
    context.subscriptions.push({
        dispose: () => watcher.stop(),
    });
}
function deactivate() {
    watcher?.stop();
}
