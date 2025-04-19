import appContext from "../../components/app_context.js";
import { t } from "../../services/i18n.js";
import OnClickButtonWidget from "../buttons/onclick_button.js";

export default class RefreshButton extends OnClickButtonWidget {
    constructor() {
        super();

        this
            .title(t("backend_log.refresh"))
            .icon("bx-refresh")
            .onClick(() => this.triggerEvent("refreshData", { ntxId: this.noteContext?.ntxId }))
    }

    isEnabled(): boolean | null | undefined {
        return super.isEnabled()
            && this.note?.noteId === "_backendLog"
            && this.noteContext?.viewScope?.viewMode === "default";
    }

}
