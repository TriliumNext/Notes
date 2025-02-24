import TypeWidget from "./type_widget.js";
import libraryLoader from "../../services/library_loader.js";
import options from "../../services/options.js";

/**
 * An abstract {@link TypeWidget} which implements the CodeMirror editor, meant to be used as a parent for
 * widgets requiring the editor.
 *
 * The widget handles the loading and initialization of the CodeMirror editor, as well as some common
 * actions.
 *
 * The derived class must:
 *
 * - Define `$editor` in the constructor.
 * - Call `super.doRender()` in the extended class.
 * - Call `this._update(note, content)` in `#doRefresh(note)`.
 */
export default class AbstractCodeTypeWidget extends TypeWidget {
    doRender() {
        this.initialized = this.#initEditor();
    }

    async #initEditor() {
        await libraryLoader.requireLibrary(libraryLoader.CODE_MIRROR);

        // these conflict with backward/forward navigation shortcuts
        delete CodeMirror.keyMap.default["Alt-Left"];
        delete CodeMirror.keyMap.default["Alt-Right"];

        CodeMirror.modeURL = `${window.glob.assetPath}/node_modules/codemirror/mode/%N/%N.js`;
        CodeMirror.modeInfo.find((mode) => mode.name === "JavaScript").mimes.push(...["application/javascript;env=frontend", "application/javascript;env=backend"]);
        CodeMirror.modeInfo.find((mode) => mode.name === "SQLite").mimes = ["text/x-sqlite", "text/x-sqlite;schema=trilium"];

        this.codeEditor = CodeMirror(this.$editor[0], {
            value: "",
            viewportMargin: Infinity,
            indentUnit: 4,
            matchBrackets: true,
            matchTags: { bothTags: true },
            highlightSelectionMatches: { showToken: false, annotateScrollbar: false },
            lineNumbers: true,
            // we line wrap partly also because without it horizontal scrollbar displays only when you scroll
            // all the way to the bottom of the note. With line wrap, there's no horizontal scrollbar so no problem
            lineWrapping: options.is("codeLineWrapEnabled"),
            ...this.getExtraOpts()
        });
        this.onEditorInitialized();
    }

    /**
     * Can be extended in derived classes to add extra options to the CodeMirror constructor. The options are appended
     * at the end, so it is possible to override the default values introduced by the abstract editor as well.
     *
     * @returns the extra options to be passed to the CodeMirror constructor.
     */
    getExtraOpts() {
        return {};
    }

    /**
     * Called as soon as the CodeMirror library has been loaded and the editor was constructed. Can be extended in
     * derived classes to add additional functionality or to register event handlers.
     *
     * By default, it does nothing.
     */
    onEditorInitialized() {
        // Do nothing by default.
    }

    /**
     * Must be called by the derived classes in `#doRefresh(note)` in order to react to changes.
     *
     * @param {*} note the note that was changed.
     * @param {*} content the new content of the note.
     */
    _update(note, content) {
        // CodeMirror breaks pretty badly on null, so even though it shouldn't happen (guarded by a consistency check)
        // we provide fallback
        this.codeEditor.setValue(content || "");
        this.codeEditor.clearHistory();

        let info = CodeMirror.findModeByMIME(note.mime);
        if (!info) {
            // Switch back to plain text if CodeMirror does not have a mode for whatever MIME type we're editing.
            // To avoid inheriting a mode from a previously open code note.
            info = CodeMirror.findModeByMIME("text/plain");
        }

        this.codeEditor.setOption("mode", info.mime);
        CodeMirror.autoLoadMode(this.codeEditor, info.mode);
    }

    show() {
        this.$widget.show();

        if (this.codeEditor) {
            // show can be called before render
            this.codeEditor.refresh();
        }
    }

    focus() {
        this.$editor.focus();
        this.codeEditor.focus();
    }

    scrollToEnd() {
        this.codeEditor.setCursor(this.codeEditor.lineCount(), 0);
        this.codeEditor.focus();
    }

    cleanup() {
        if (this.codeEditor) {
            this.spacedUpdate.allowUpdateWithoutChange(() => {
                this.codeEditor.setValue("");
            });
        }
    }
}
