import { app } from "electron";
import type { CommandListenerData, EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import { t } from "../../services/i18n.js";
import keyboardActionService from "../../services/keyboard_actions.js";
import options from "../../services/options.js";
import AbstractCodeTypeWidget from "./abstract_code_type_widget.js";
import appContext from "../../components/app_context.js";
import type { TouchBarItem } from "../touch_bar.js";

const TPL = /*html*/`
<div class="note-detail-code note-detail-printable">
    <style>
    .note-detail-code {
        position: relative;
        height: 100%;
    }

    .note-detail-code-editor {
        min-height: 50px;
        height: 100%;
    }
    </style>

    <div class="note-detail-code-editor"></div>
</div>`;

export default class EditableCodeTypeWidget extends AbstractCodeTypeWidget {

    static getType() {
        return "editableCode";
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
        this.$editor = this.$widget.find(".note-detail-code-editor");

        keyboardActionService.setupActionsForElement("code-detail", this.$widget, this);

        super.doRender();
    }

    getExtraOpts(): Partial<CodeMirrorOpts> {
        return {
            keyMap: options.is("vimKeymapEnabled") ? "vim" : "default",
            lint: true,
            gutters: ["CodeMirror-lint-markers"],
            tabindex: 300,
            dragDrop: false, // with true the editor inlines dropped files which is not what we expect
            placeholder: t("editable_code.placeholder")
        };
    }

    onEditorInitialized() {
        this.codeEditor.on("change", () => this.spacedUpdate.scheduleUpdate());
    }

    async doRefresh(note: FNote) {
        const blob = await this.note?.getBlob();

        await this.spacedUpdate.allowUpdateWithoutChange(() => {
            this._update(note, blob?.content ?? "");
        });

        this.show();

        this.triggerCommand("refreshTouchBar");
    }

    getData() {
        return {
            content: this.codeEditor.getValue()
        };
    }

    async executeWithCodeEditorEvent({ resolve, ntxId }: EventData<"executeWithCodeEditor">) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        await this.initialized;

        resolve(this.codeEditor);
    }

    buildTouchBarCommand({ TouchBar, buildIcon }: CommandListenerData<"buildTouchBar">) {
        const items: TouchBarItem[] = [
            new TouchBar.TouchBarSpacer({ size: "flexible" }),
        ];

        const note = this.note;
        if (note?.mime.startsWith("application/javascript") || note?.mime === "text/x-sqlite;schema=trilium") {
            items.push(new TouchBar.TouchBarButton({
                icon: buildIcon("NSImageNameTouchBarPlayTemplate"),
                click: () => appContext.triggerCommand("runActiveNote")
            }));
        }

        return items;
    }

}
