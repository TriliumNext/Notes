import SwitchWidget from "./switch.js";
import branchService from "../services/branches.js";
import server from "../services/server.js";
import utils from "../services/utils.js";
import syncService from "../services/sync.js";
import dialogService from "../services/dialog.js";
import { t } from "../services/i18n.js";

export default class SharedSwitchWidget extends SwitchWidget {
    isEnabled() {
        return super.isEnabled() && !["root", "_share", "_hidden"].includes(this.noteId) && !this.noteId.startsWith("_options");
    }

    doRender() {
        super.doRender();

        this.switchOnName = t("shared_switch.shared");
        this.switchOnTooltip = t("shared_switch.toggle-on-title");

        this.switchOffName = t("shared_switch.shared");
        this.switchOffTooltip = t("shared_switch.toggle-off-title");

        this.$helpButton.attr("data-help-page", "sharing.html").show();
        this.$helpButton.on("click", (e) => utils.openHelp($(e.target)));
    }

    async switchOn() {
        await branchService.cloneNoteToParentNote(this.noteId, "_share");

        syncService.syncNow(true);
    }

    async switchOff() {
        const shareBranch = this.note.getParentBranches().find((b) => b.parentNoteId === "_share");

        if (!shareBranch) {
            return;
        }

        if (this.note.getParentBranches().length === 1) {
            if (!(await dialogService.confirm(t("shared_switch.shared-branch")))) {
                return;
            }
        }

        await server.remove(`branches/${shareBranch.branchId}?taskId=no-progress-reporting`);

        syncService.syncNow(true);
    }

    async refreshWithNote(note) {
        const isShared = note.hasAncestor("_share");
        const canBeUnshared = isShared && note.getParentBranches().find((b) => b.parentNoteId === "_share");
        const switchDisabled = isShared && !canBeUnshared;

        this.isToggled = isShared;

        if (switchDisabled) {
            this.disabledTooltip = t("shared_switch.inherited");
            this.canToggle = false;
        } else {
            this.disabledTooltip = "";
            this.canToggle = true;
        }
    }

    entitiesReloadedEvent({ loadResults }) {
        if (loadResults.getBranchRows().find((b) => b.noteId === this.noteId)) {
            this.refresh();
        }
    }
}
