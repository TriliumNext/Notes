import type { FilterOptionsByType, OptionDefinitions, OptionMap, OptionNames } from "../../../../../services/options_interface.js";
import type { EventData, EventListener } from "../../../components/app_context.js";
import type FNote from "../../../entities/fnote.js";
import { t } from "../../../services/i18n.js";
import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import NoteContextAwareWidget from "../../note_context_aware_widget.js";

export default class OptionsWidget extends NoteContextAwareWidget implements EventListener<"entitiesReloaded"> {
    constructor() {
        super();

        this.contentSized();
    }

    async updateOption<T extends OptionNames>(name: T, value: string | number | string[] | undefined) {
        const opts = { [name]: value };

        await this.updateMultipleOptions(opts);
    }

    async updateMultipleOptions(opts: Partial<OptionMap>) {
        await server.put("options", opts);

        this.showUpdateNotification();
    }

    showUpdateNotification() {
        toastService.showPersistent({
            id: "options-change-saved",
            title: t("options_widget.options_status"),
            message: t("options_widget.options_change_saved"),
            icon: "slider",
            closeAfter: 2000
        });
    }

    async updateCheckboxOption<T extends FilterOptionsByType<boolean>>(name: T, $checkbox: JQuery<HTMLElement>) {
        const isChecked = $checkbox.prop("checked");

        return await this.updateOption(name, isChecked ? "true" : "false");
    }

    setCheckboxState($checkbox: JQuery<HTMLElement>, optionValue: string) {
        $checkbox.prop("checked", optionValue === "true");
    }

    optionsLoaded(options: OptionMap) {}

    async refresh() {
        this.toggleInt(this.isEnabled());
        try {
            await this.refreshWithNote(this.note);
        } catch (e) {
            // Ignore errors when user is refreshing or navigating away.
            if (e === "rejected by browser") {
                return;
            }

            throw e;
        }
    }

    async refreshWithNote(note: FNote | null | undefined) {
        const options = await server.get<OptionMap>("options");

        if (options) {
            this.optionsLoaded(options);
        }
    }

    async entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.getOptionNames().length > 0) {
            this.refresh();
        }
    }
}
