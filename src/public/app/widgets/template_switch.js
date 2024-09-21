import SwitchWidget from "./switch.js";
import attributeService from "../services/attributes.js";
import { t } from "../services/i18n.js";

/**
 * Switch for the basic properties widget which allows the user to select whether the note is a template or not, which toggles the `#template` attribute.
 */
export default class TemplateSwitchWidget extends SwitchWidget {

    isEnabled() {
        return super.isEnabled()
            && !this.noteId.startsWith('_options');
    }

    doRender() {
        super.doRender();

        this.$switchOnName.text(t("template_switch.template"));
        this.$switchOnButton.attr("title", t("template_switch.toggle-on-hint"));

        this.$switchOffName.text("Template");
        this.$switchOffButton.attr("title", t("template_switch.toggle-off-hint"));

        this.$helpButton.attr("data-help-page", "template.html").show();
        this.$helpButton.on('click', e => utils.openHelp($(e.target)));
    }

    async switchOn() {
        await attributeService.setLabel(this.noteId, 'template');
    }

    async switchOff() {
        for (const templateAttr of this.note.getOwnedLabels('template')) {
            await attributeService.removeAttributeById(this.noteId, templateAttr.attributeId);
        }
    }

    async refreshWithNote(note) {
        const isTemplate = note.hasLabel("template");
        this.$switchOn.toggle(!isTemplate);
        this.$switchOff.toggle(!!isTemplate);
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.getAttributeRows().find(attr => attr.type === 'label' && attr.name === "template" && attr.noteId === this.noteId)) {
            this.refresh();
        }
    }

}