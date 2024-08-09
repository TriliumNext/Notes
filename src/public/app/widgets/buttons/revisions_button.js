import { t } from "../../services/i18n.js";
import CommandButtonWidget from "./command_button.js";

export default class RevisionsButton extends CommandButtonWidget {
    constructor() {
        super();

        this.icon('bx-history')
            .title(t("revisions_button.note_revisions"))
            .command("showRevisions")
            .titlePlacement("bottom")
            .class("icon-action");
    }

    isEnabled() {
        return super.isEnabled() && !['launcher', 'doc'].includes(this.note?.type);
    }
}
