/**
 * Widget: Show highlighted text in the right pane
 *
 * By design, there's no support for nonsensical or malformed constructs:
 * - For example, if there is a formula in the middle of the highlighted text, the two ends of the formula will be regarded as two entries
 */

import { t } from "../services/i18n.js";
import attributeService from "../services/attributes.js";
import RightPanelWidget from "./right_panel_widget.js";
import options from "../services/options.js";
import OnClickButtonWidget from "./buttons/onclick_button.js";
import appContext from "../components/app_context.js";
import libraryLoader from "../services/library_loader.js";

const TPL = `<div class="highlights-list-widget">
    <style>
        .highlights-list-widget {
            padding: 10px;
            contain: none; 
            overflow: auto;
            position: relative;
        }
        
        .highlights-list > ol {
            padding-left: 20px;
        }
        
        .highlights-list li {
            cursor: pointer;
            margin-bottom: 3px;
            text-align: justify;
            word-wrap: break-word;
            hyphens: auto;
        }
        
        .highlights-list li:hover {
            font-weight: bold;
        }
    </style>

    <span class="highlights-list"></span>
</div>`;

export default class HighlightsListWidget extends RightPanelWidget {
    get widgetTitle() {
        return t("highlights_list_2.title");
    }

    get widgetButtons() {
        return [
            new OnClickButtonWidget()
                .icon("bx-cog")
                .title(t("highlights_list_2.options"))
                .titlePlacement("left")
                .onClick(() => appContext.tabManager.openContextWithNote('_optionsTextNotes', { activate: true }))
                .class("icon-action"),
            new OnClickButtonWidget()
                .icon("bx-x")
                .titlePlacement("left")
                .onClick(widget => widget.triggerCommand("closeHlt"))
                .class("icon-action")
        ];
    }

    isEnabled() {
        return super.isEnabled()
            && this.note.type === 'text'
            && !this.noteContext.viewScope.highlightsListTemporarilyHidden
            && this.noteContext.viewScope.viewMode === 'default';
    }

    async doRenderBody() {
        this.$body.empty().append($(TPL));
        this.$highlightsList = this.$body.find('.highlights-list');
    }

    async refreshWithNote(note) {
        /* The reason for adding highlightsListPreviousVisible is to record whether the previous state
           of the highlightsList is hidden or displayed, and then let it be displayed/hidden at the initial time.
           If there is no such value, when the right panel needs to display toc but not highlighttext,
           every time the note content is changed, highlighttext Widget will appear and then close immediately,
           because getHlt function will consume time */
        if (this.noteContext.viewScope.highlightsListPreviousVisible) {
            this.toggleInt(true);
        } else {
            this.toggleInt(false);
        }

        const optionsHighlightsList = JSON.parse(options.get('highlightsList'));

        if (note.isLabelTruthy('hideHighlightWidget') || !optionsHighlightsList.length) {
            this.toggleInt(false);
            this.triggerCommand("reEvaluateRightPaneVisibility");
            return;
        }

        let $highlightsList = "", hlLiCount = -1;
        // Check for type text unconditionally in case alwaysShowWidget is set
        if (this.note.type === 'text') {
            const { content } = await note.getNoteComplement();
            ({ $highlightsList, hlLiCount } = await this.getHighlightList(content, optionsHighlightsList));
        }
        this.$highlightsList.empty().append($highlightsList);
        if (hlLiCount > 0) {
            this.toggleInt(true);
            this.noteContext.viewScope.highlightsListPreviousVisible = true;
        } else {
            this.toggleInt(false);
            this.noteContext.viewScope.highlightsListPreviousVisible = false;
        }

        this.triggerCommand("reEvaluateRightPaneVisibility");
    }

    extractOuterTag(htmlStr) {
        if (htmlStr === null) {
            return null
        }
        // Regular expressions that match only the outermost tag
        const regex = /^<([a-zA-Z]+)([^>]*)>/;
        const match = htmlStr.match(regex);
        if (match) {
            const tagName = match[1].toLowerCase(); // Extract tag name
            const attributes = match[2].trim(); // Extract label attributes
            return { tagName, attributes };
        }
        return null;
    }

    areOuterTagsConsistent(str1, str2) {
        const tag1 = this.extractOuterTag(str1);
        const tag2 = this.extractOuterTag(str2);
        // If one of them has no label, returns false
        if (!tag1 || !tag2) {
            return false;
        }
        // Compare tag names and attributes to see if they are the same
        return tag1.tagName === tag2.tagName && tag1.attributes === tag2.attributes;
    }

    /**
     * Rendering formulas in strings using katex
     *
     * @param {string} html Note's html content
     * @returns {string} The HTML content with mathematical formulas rendered by KaTeX.
     */
    async replaceMathTextWithKatax(html) {
        const mathTextRegex = /<span class="math-tex">\\\(([\s\S]*?)\\\)<\/span>/g;
        var matches = [...html.matchAll(mathTextRegex)];
        let modifiedText = html;

        if (matches.length > 0) {
            // Process all matches asynchronously
            for (const match of matches) {
                let latexCode = match[1];
                let rendered;

                try {
                    rendered = katex.renderToString(latexCode, {
                        throwOnError: false
                    });
                } catch (e) {
                    if (e instanceof ReferenceError && e.message.includes('katex is not defined')) {
                        // Load KaTeX if it is not already loaded
                        await libraryLoader.requireLibrary(libraryLoader.KATEX);
                        try {
                            rendered = katex.renderToString(latexCode, {
                                throwOnError: false
                            });
                        } catch (renderError) {
                            console.error("KaTeX rendering error after loading library:", renderError);
                            rendered = match[0]; // Fall back to original if error persists
                        }
                    } else {
                        console.error("KaTeX rendering error:", e);
                        rendered = match[0]; // Fall back to original on error
                    }
                }

                // Replace the matched formula in the modified text
                modifiedText = modifiedText.replace(match[0], rendered);
            }
        }
        return modifiedText;
    }

    async getHighlightList(content, optionsHighlightsList) {
        // matches a span containing background-color
        const regex1 = /<span[^>]*style\s*=\s*[^>]*background-color:[^>]*?>[\s\S]*?<\/span>/gi;
        // matches a span containing color
        const regex2 = /<span[^>]*style\s*=\s*[^>]*[^-]color:[^>]*?>[\s\S]*?<\/span>/gi;
        // match italics
        const regex3 = /<i>[\s\S]*?<\/i>/gi;
        // match bold
        const regex4 = /<strong>[\s\S]*?<\/strong>/gi;
        // match underline
        const regex5 = /<u>[\s\S]*?<\/u>/g;
        // Possible values in optionsHighlightsList： '["bold","italic","underline","color","bgColor"]'
        // element priority： span>i>strong>u
        let findSubStr = "", combinedRegexStr = "";
        if (optionsHighlightsList.includes("bgColor")) {
            findSubStr += `,span[style*="background-color"]:not(section.include-note span[style*="background-color"])`;
            combinedRegexStr += `|${regex1.source}`;
        }
        if (optionsHighlightsList.includes("color")) {
            findSubStr += `,span[style*="color"]:not(section.include-note span[style*="color"])`;
            combinedRegexStr += `|${regex2.source}`;
        }
        if (optionsHighlightsList.includes("italic")) {
            findSubStr += `,i:not(section.include-note i)`;
            combinedRegexStr += `|${regex3.source}`;
        }
        if (optionsHighlightsList.includes("bold")) {
            findSubStr += `,strong:not(section.include-note strong)`;
            combinedRegexStr += `|${regex4.source}`;
        }
        if (optionsHighlightsList.includes("underline")) {
            findSubStr += `,u:not(section.include-note u)`;
            combinedRegexStr += `|${regex5.source}`;
        }

        findSubStr = findSubStr.substring(1)
        combinedRegexStr = `(` + combinedRegexStr.substring(1) + `)`;
        const combinedRegex = new RegExp(combinedRegexStr, 'gi');
        const $highlightsList = $("<ol>");
        let prevEndIndex = -1, hlLiCount = 0;
        let prevSubHtml = null;
        // Used to determine if a string is only a formula
        const onlyMathRegex = /^<span class="math-tex">\\\([^\)]*?\)<\/span>(?:<span class="math-tex">\\\([^\)]*?\)<\/span>)*$/;

        for (let match = null, hltIndex = 0; ((match = combinedRegex.exec(content)) !== null); hltIndex++) {
            const subHtml = match[0];
            const startIndex = match.index;
            const endIndex = combinedRegex.lastIndex;
            if (prevEndIndex !== -1 && startIndex === prevEndIndex) {
                // If the previous element is connected to this element in HTML, then concatenate them into one.
                $highlightsList.children().last().append(subHtml);
            } else {
                // TODO: can't be done with $(subHtml).text()?
                //Can’t remember why regular expressions are used here, but modified to $(subHtml).text() works as expected
                //const hasText = [...subHtml.matchAll(/(?<=^|>)[^><]+?(?=<|$)/g)].map(matchTmp => matchTmp[0]).join('').trim();
                const hasText = $(subHtml).text().trim();

                if (hasText) {
                    const substring = content.substring(prevEndIndex, startIndex);
                    //If the two elements have the same style and there are only formulas in between, append the formulas and the current element to the end of the previous element.
                    if (this.areOuterTagsConsistent(prevSubHtml, subHtml) && onlyMathRegex.test(substring)) {
                        const $lastLi = $highlightsList.children('li').last();
                        $lastLi.append(await this.replaceMathTextWithKatax(substring));
                        $lastLi.append(subHtml);
                    } else {
                        $highlightsList.append(
                            $('<li>')
                                .html(subHtml)
                                .on("click", () => this.jumpToHighlightsList(findSubStr, hltIndex))
                        );
                    }

                    hlLiCount++;
                } else {
                    // hide li if its text content is empty
                    continue;
                }
            }
            prevEndIndex = endIndex;
            prevSubHtml = subHtml;
        }
        return {
            $highlightsList,
            hlLiCount
        };
    }

    async jumpToHighlightsList(findSubStr, itemIndex) {
        const isReadOnly = await this.noteContext.isReadOnly();
        let targetElement;
        if (isReadOnly) {
            const $container = await this.noteContext.getContentElement();
            targetElement = $container.find(findSubStr).filter(function () {
                if (findSubStr.indexOf("color") >= 0 && findSubStr.indexOf("background-color") < 0) {
                    let color = this.style.color;
                    return !($(this).prop('tagName') === "SPAN" && color === "");
                } else {
                    return true;
                }
            }).filter(function () {
                return $(this).parent(findSubStr).length === 0
                    && $(this).parent().parent(findSubStr).length === 0
                    && $(this).parent().parent().parent(findSubStr).length === 0
                    && $(this).parent().parent().parent().parent(findSubStr).length === 0;
            })
        } else {
            const textEditor = await this.noteContext.getTextEditor();
            targetElement = $(textEditor.editing.view.domRoots.values().next().value).find(findSubStr).filter(function () {
                // When finding span[style*="color"] but not looking for span[style*="background-color"],
                // the background-color error will be regarded as color, so it needs to be filtered
                if (findSubStr.indexOf("color") >= 0 && findSubStr.indexOf("background-color") < 0) {
                    let color = this.style.color;
                    return !($(this).prop('tagName') === "SPAN" && color === "");
                } else {
                    return true;
                }
            }).filter(function () {
                // Need to filter out the child elements of the element that has been found
                return $(this).parent(findSubStr).length === 0
                    && $(this).parent().parent(findSubStr).length === 0
                    && $(this).parent().parent().parent(findSubStr).length === 0
                    && $(this).parent().parent().parent().parent(findSubStr).length === 0;
            })
        }
        targetElement[itemIndex].scrollIntoView({
            behavior: "smooth", block: "center"
        });
    }

    async closeHltCommand() {
        this.noteContext.viewScope.highlightsListTemporarilyHidden = true;
        await this.refresh();
        this.triggerCommand('reEvaluateRightPaneVisibility');
        appContext.triggerEvent("reEvaluateHighlightsListWidgetVisibility", { noteId: this.noteId });
    }

    async showHighlightsListWidgetEvent({ noteId }) {
        if (this.noteId === noteId) {
            await this.refresh();
            this.triggerCommand('reEvaluateRightPaneVisibility');
        }
    }

    async entitiesReloadedEvent({ loadResults }) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            await this.refresh();
        } else if (loadResults.getAttributeRows().find(attr => attr.type === 'label'
            && (attr.name.toLowerCase().includes('readonly') || attr.name === 'hideHighlightWidget')
            && attributeService.isAffecting(attr, this.note))) {
            await this.refresh();
        }
    }
}
