import BasicWidget from "./basic_widget.js";
import { t } from "../services/i18n.js";

const TPL = `\
<div class="close-zen-container">
    <button class="button-widget bx icon-action bxs-yin-yang"
        data-trigger-command="toggleZenMode"
        title="${t("zen_mode.button_exit")}"
    />

    <style>
    :root {
        --zen-button-size: 32px;
    }

    .close-zen-container {
        display: none;
        width: var(--zen-button-size);
        height: var(--zen-button-size);
    }

    body.zen .close-zen-container {
        display: block;
        position: fixed;
        top: 2px;
        right: 2px;
        z-index: 9999;
        -webkit-app-region: no-drag;
    }

    body.zen.electron:not(.platform-darwin):not(.native-titlebar) .close-zen-container {
        left: calc(env(titlebar-area-width) - var(--zen-button-size) - 2px);
        right: unset;
    }
    </style>
</div>
`;

export default class CloseZenButton extends BasicWidget {

    doRender(): void {
        this.$widget = $(TPL);
    }

    zenChangedEvent() {
        this.toggleInt(true);
    }

}
