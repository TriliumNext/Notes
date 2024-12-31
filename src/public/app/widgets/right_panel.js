import TabCachingWidget from "./tab_caching_widget.js";
import SpacedUpdateWidget from "./spaced_update_widget.js";
import NoteDetailWidget from "./note_detail.js";
import CalendarWidget from "./calendar.js";
import LinkMapWidget from "./link_map.js";
import NoteInfoWidget from "./note_info.js";
import SimilarNotesWidget from "./similar_notes.js";
import WhatLinksHereWidget from "./what_links_here.js";
import ChatWidget from "./chat_widget.js";

const TPL = `
<div class="right-panel">
    <style>
        .right-panel {
            flex-shrink: 0;
            flex-grow: 0;
            width: 300px;
            border-left: 1px solid var(--main-border-color);
            display: flex;
            flex-direction: column;
        }
        
        .right-panel .card-header {
            font-size: 14px;
            border-top: 0;
            border-right: 0;
            border-left: 0;
            padding: 6px 10px 3px 10px;
            background: inherit;
            border-radius: 0;
        }
        
        .right-panel .widget-header {
            border-radius: 0;
            padding: 4px 9px 4px 9px;
            border: 0;
            background: inherit;
            font-size: 14px;
            border-bottom: 1px solid var(--main-border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 5px;
        }
        
        .right-panel .widget-help {
            color: var(--muted-text-color);
            position: relative;
            top: 2px;
            cursor: pointer;
        }
        
        .right-panel .widget-help.no-link:hover {
            cursor: default;
            text-decoration: none;
        }
        
        .right-panel .widget-header .widget-header-action {
            padding-left: 5px;
            cursor: pointer;
            font-size: large;
            position: relative;
            top: 1px;
        }
        
        .right-panel .widget-header:not(.active):hover {
            background: var(--hover-item-background-color);
            cursor: pointer;
        }
        
        .right-panel .widget-header.active {
            background: var(--active-item-background-color) !important;
        }
        
        .right-panel .widget-body {
            overflow: auto;
            height: 100%;
        }
        
        .right-panel .right-panel-tabs {
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
    </style>

    <div class="right-panel-tabs">
        <div class="widget-header" data-tab-widget-id="note-info">
            <span>Note info</span>
            <span class="bx bx-info-circle widget-help" title="Info"></span>
        </div>

        <div class="widget-header" data-tab-widget-id="chat">
            <span>Chat</span>
            <span class="bx bx-chat widget-help" title="Chat with your notes"></span>
        </div>

        <div class="widget-header" data-tab-widget-id="what-links-here">
            <span>Links to this note</span>
            <span class="bx bx-share widget-help" title="Incoming links"></span>
        </div>

        <div class="widget-header" data-tab-widget-id="similar-notes">
            <span>Similar notes</span>
            <span class="bx bx-copy-alt widget-help" title="Similar notes"></span>
        </div>

        <div class="widget-header" data-tab-widget-id="calendar">
            <span>Calendar</span>
            <span class="bx bx-calendar widget-help" title="Calendar"></span>
        </div>

        <div class="widget-header" data-tab-widget-id="link-map">
            <span>Link map</span>
            <span class="bx bx-map-alt widget-help" title="Link map"></span>
        </div>

        <div class="widget-body"></div>
    </div>
</div>`;

export default class RightPanelWidget extends TabCachingWidget {
    constructor() {
        super();

        this.widgets = {};

        this.child(this.widgets.noteInfo = new NoteInfoWidget())
            .child(this.widgets.chat = new ChatWidget())
            .child(this.widgets.whatLinksHere = new WhatLinksHereWidget())
            .child(this.widgets.similarNotes = new SimilarNotesWidget())
            .child(this.widgets.calendar = new CalendarWidget())
            .child(this.widgets.linkMap = new LinkMapWidget());
    }

    doRender() {
        this.$widget = $(TPL);
        this.overflowing();

        this.$body = this.$widget.find('.widget-body');
        this.$tabHeaders = this.$widget.find('.widget-header');

        this.$tabHeaders.on('click', e => {
            const $header = $(e.currentTarget);
            const widgetId = $header.attr('data-tab-widget-id');

            this.activeTabId = widgetId;

            this.$tabHeaders.removeClass('active');
            $header.addClass('active');

            this.widgets[widgetId].handleEvent('noteSwitched', {
                noteContext: this.noteContext,
                notePath: this.notePath
            });

            this.renderActiveTab();
        });

        return this.$widget;
    }

    async refresh() {
        this.renderActiveTab();
    }

    async renderActiveTab() {
        const $activeHeader = this.$tabHeaders.filter('.active');
        const activeTabId = $activeHeader.length > 0
            ? $activeHeader.attr('data-tab-widget-id')
            : this.activeTabId || 'noteInfo';

        this.$tabHeaders.removeClass('active');
        this.$tabHeaders
            .filter(`[data-tab-widget-id="${activeTabId}"]`)
            .addClass('active');

        this.$body.empty();
        this.$body.append(await this.widgets[activeTabId].render());
    }

    async noteSwitchedEvent({noteContext, notePath}) {
        this.noteContext = noteContext;
        this.notePath = notePath;

        await super.noteSwitchedEvent({noteContext, notePath});
    }

    entitiesReloadedEvent({loadResults}) {
        super.entitiesReloadedEvent({loadResults});
    }
}
