import OnClickButtonWidget from './onclick_button.js';
import { t } from '../../services/i18n.js';

export default class ScrollToBottomButton extends OnClickButtonWidget {
    constructor() {
        super();

        this.isAtBottom = false;

        this.icon('bx-chevron-down')
            .title(t('onclick_button.scroll_to_bottom'))
            .class('icon-action')
            .onClick((widget, evt) => {
                const $noteSplit = $(`.note-split[data-ntx-id="${this.noteContext.ntxId}"]`);
                const $scrollingContainer = $noteSplit.children('.scrolling-container');

                if (this.isAtBottom) {
                    $scrollingContainer.scrollTop(0);
                    this.settings.title = t('onclick_button.scroll_to_bottom');
                    this.$widget.addClass('bx-chevron-down').removeClass('bx-chevron-up');
                } else {
                    $scrollingContainer.scrollTop($scrollingContainer[0].scrollHeight);
                    this.settings.title = t('onclick_button.scroll_to_top');
                    this.$widget.addClass('bx-chevron-up').removeClass('bx-chevron-down');
                }
                this.isAtBottom = !this.isAtBottom;
            });
    }
}
