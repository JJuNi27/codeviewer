"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentWatcher = void 0;
const vscode = require("vscode");
const debounce_1 = require("../services/debounce");
class DocumentWatcher {
    constructor() {
        this.disposables = [];
    }
    start(onCodeChanged, onCursorLineChanged) {
        this.stop();
        const emitCurrent = () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            onCodeChanged(editor.document.getText());
        };
        const emitCursor = () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            onCursorLineChanged?.(editor.selection.active.line);
        };
        const debouncedEmit = (0, debounce_1.debounce)(() => emitCurrent(), 120);
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(() => debouncedEmit()));
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => {
            emitCurrent();
            emitCursor();
        }));
        this.disposables.push(vscode.window.onDidChangeTextEditorSelection(() => emitCursor()));
        emitCurrent();
        emitCursor();
    }
    stop() {
        for (const d of this.disposables)
            d.dispose();
        this.disposables = [];
    }
}
exports.DocumentWatcher = DocumentWatcher;
