"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentWatcher = void 0;
// watch document changes + debounce
const vscode = require("vscode");
const debounce_1 = require("../services/debounce");
class DocumentWatcher {
    constructor() {
        this.disposables = [];
    }
    start(onCodeChanged) {
        this.stop(); // 중복 등록 방지
        const emitCurrent = () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            onCodeChanged(editor.document.getText());
        };
        const emitCurrentDebounced = (0, debounce_1.debounce)(emitCurrent, 300);
        // 타이핑/편집 감지
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(() => {
            emitCurrentDebounced();
        }));
        // 탭 전환 감지 (파일 바꾸면 바로 반영)
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => {
            emitCurrent();
        }));
        // 시작하자마자 1번 반영
        emitCurrent();
    }
    stop() {
        for (const d of this.disposables)
            d.dispose();
        this.disposables = [];
    }
}
exports.DocumentWatcher = DocumentWatcher;
