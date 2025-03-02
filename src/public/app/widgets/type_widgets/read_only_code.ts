import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import AbstractCodeTypeWidget from "./abstract_code_type_widget.js";

const TPL = `
<div class="note-detail-readonly-code note-detail-printable">
    <style>
    .note-detail-readonly-code {
        min-height: 50px;
        position: relative;
    }

    .note-detail-readonly-code-content {
        padding: 10px;
    }
    </style>

    <pre class="note-detail-readonly-code-content"></pre>
</div>`;

export default class ReadOnlyCodeTypeWidget extends AbstractCodeTypeWidget {
    $editor!: JQuery<HTMLElement>;

    static getType() {
        return "readOnlyCode";
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
        this.$editor = this.$widget.find(".note-detail-readonly-code-content");

        super.doRender();
    }

    async doRefresh(note: FNote | null | undefined) {
        const blob = await this.note?.getBlob();
        if (!blob || !note) return false;

        const isFormattable = note.type === "text" && this.noteContext?.viewScope?.viewMode === "source";
        const content = isFormattable ? this.format(blob.content) : blob.content;

        this._update(note, content);
        this.show();
    }

    getExtraOpts() {
        return {
            readOnly: true
        };
    }

    async executeWithContentElementEvent({ resolve, ntxId }: EventData<"executeWithContentElement">) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        await this.initialized;

        resolve(this.$editor);
    }

    format(html: string) {
        let indent = "\n";
        const tab = "\t";
        let i = 0;
        let pre: { indent: string; tag: string }[] = [];

        const selfClosingTags = new Set(["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "menuitem", "meta", "param", "source", "track", "wbr"]);

        html = html
            // match everything, including whitespace/newline characters
            // TriliumNextTODO: this only seems to replace the very first occurence of a "pre" tag.
            //  => the i++ makes it look like this isn't on purpose though.
            // The "dot" is also matching too greedy, i.e. it matches everything in between the first and last pre tag,
            // even if there other pre-tags nested (which is valid HTML apparently). The fix would be:
            // a) add the g flag for matching more than one ocurrence
            // b) add "?" as lazy quantifier after the "+" like so
            // /<pre>((.)+?)<\/pre>/g
            .replace(/<pre>((.)+)?<\/pre>/s, (match) => {
                pre.push({ indent: "", tag: match });
                return `<--TEMPPRE${i++}/-->`;
            })
            .replace(new RegExp("<[^<>]+>[^<]?", "g"), (x) => {
                const tagMatch = /<\/?([^\s/>]+)/.exec(x);
                let tag = tagMatch ? tagMatch[1] : "";
                let tempPreIdxMatch = new RegExp("<--TEMPPRE(\\d+)/-->").exec(x);

                if (tempPreIdxMatch) {
                    const tempPreIdx = parseInt(tempPreIdxMatch[1]);
                    pre[tempPreIdx].indent = indent;
                }

                if (selfClosingTags.has(tag)) {
                    return indent + x;
                }

                //close tag
                if (x.includes("</")) {
                    indent = indent.slice(0, -1);
                    return (!x.endsWith(">"))
                        ? indent + x.slice(0, -1) + indent + x.slice(-1)
                        : indent + x;
                }

                // open tag
                if (!tempPreIdxMatch) {
                    indent += tab;
                }

                return (!x.endsWith(">"))
                    ? indent + x.slice(0, -1) + indent + tab + x.slice(-1)
                    : indent + x;
            });

        for (i = pre.length; i--; ) {
            const formattedPreTag = pre[i].tag
                .replace("<pre>", "<pre>\n")
                .replace("</pre>", pre[i].indent + "</pre>");

            html = html.replace(`<--TEMPPRE${i}/-->`, formattedPreTag);
        }

        return html.charAt(0) === "\n" ? html.substr(1, html.length - 1) : html;
    }
}
