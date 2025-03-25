import type FNote from "./entities/fnote";
import type { Froca } from "./services/froca-interface";
import { Suggestion } from "./services/note_autocomplete.ts";
import utils from "./services/utils.ts";
import appContext from "./components/app_context.ts";
import server from "./services/server.ts";
import library_loader, { Library } from "./services/library_loader.ts";
import type { init } from "i18next";
import type { lint } from "./services/eslint.ts";
import type { RelationType } from "./widgets/type_widgets/relation_map.ts";
import type { Mermaid } from "mermaid";

interface ElectronProcess {
    type: string;
    platform: string;
}

interface CustomGlobals {
    isDesktop: typeof utils.isDesktop;
    isMobile: typeof utils.isMobile;
    device: "mobile" | "desktop";
    getComponentByEl: typeof appContext.getComponentByEl;
    getHeaders: typeof server.getHeaders;
    getReferenceLinkTitle: (href: string) => Promise<string>;
    getReferenceLinkTitleSync: (href: string) => string;
    getActiveContextNote: FNote;
    requireLibrary: typeof library_loader.requireLibrary;
    ESLINT: Library;
    appContext: AppContext;
    froca: Froca;
    treeCache: Froca;
    importMarkdownInline: () => Promise<unknown>;
    SEARCH_HELP_TEXT: string;
    activeDialog: JQuery<HTMLElement> | null;
    componentId: string;
    csrfToken: string;
    baseApiUrl: string;
    isProtectedSessionAvailable: boolean;
    isDev: boolean;
    isMainWindow: boolean;
    maxEntityChangeIdAtLoad: number;
    maxEntityChangeSyncIdAtLoad: number;
    assetPath: string;
    appPath: string;
    instanceName: string;
    appCssNoteIds: string[];
    triliumVersion: string;
    TRILIUM_SAFE_MODE: boolean;
    platform?: typeof process.platform;
    linter: typeof lint;
    hasNativeTitleBar: boolean;
}

type RequireMethod = (moduleName: string) => any;

declare global {
    interface Window {
        logError(message: string);
        logInfo(message: string);

        process?: ElectronProcess;
        glob?: CustomGlobals;
    }

    interface AutoCompleteConfig {
        appendTo?: HTMLElement | null;
        hint?: boolean;
        openOnFocus?: boolean;
        minLength?: number;
        tabAutocomplete?: boolean;
        autoselect?: boolean;
        dropdownMenuContainer?: HTMLElement;
        debug?: boolean;
    }

    type AutoCompleteCallback = (values: AutoCompleteCallbackArg[]) => void;

    interface AutoCompleteArg {
        displayKey: "name" | "value" | "notePathTitle";
        cache?: boolean;
        source: (term: string, cb: AutoCompleteCallback) => void,
        templates?: {
            suggestion: (suggestion: Suggestion) => string | undefined
        }
    };

    interface JQuery {
        autocomplete: (action?: "close" | "open" | "destroy" | "val" | AutoCompleteConfig, args?: AutoCompleteArg[] | string) => JQuery<?>;

        getSelectedNotePath(): string | undefined;
        getSelectedNoteId(): string | null;
        setSelectedNotePath(notePath: string | null | undefined);
        getSelectedExternalLink(): string | undefined;
        setSelectedExternalLink(externalLink: string | null | undefined);
        setNote(noteId: string);
        markRegExp(regex: RegExp, opts: {
            element: string;
            className: string;
            separateWordSearch: boolean;
            caseSensitive: boolean;
            done?: () => void;
        });
        unmark(opts?: {
            done: () => void;
        });
    }

    interface JQueryStatic {
        hotkeys: {
            options: {
                filterInputAcceptingElements: boolean;
                filterContentEditable: boolean;
                filterTextInputs: boolean;
            }
        }
    }

    var logError: (message: string, e?: Error | string) => void;
    var logInfo: (message: string) => void;
    var glob: CustomGlobals;
    var require: RequireMethod;
    var __non_webpack_require__: RequireMethod | undefined;

    // Libraries
    // TODO: Replace once library loader is replaced with webpack.
    var hljs: {
        highlightAuto(text: string);
        highlight(text: string, {
            language: string
        });
    };
    var renderMathInElement: (element: HTMLElement, options: {
        trust: boolean;
    }) => void;
    var WZoom = {
        create(selector: string, opts: {
            maxScale: number;
            speed: number;
            zoomOnClick: boolean
        })
    };
    interface CKCodeBlockLanguage {
        language: string;
        label: string;
    }

    interface CKWatchdog {
        constructor(editorClass: CKEditorInstance, opts: {
            minimumNonErrorTimePeriod: number;
            crashNumberLimit: number,
            saveInterval: number
        });
        on(event: string, callback: () => void);
        state: string;
        crashes: unknown[];
        editor: TextEditor;
        setCreator(callback: (elementOrData, editorConfig) => void);
        create(el: HTMLElement, opts: {
            placeholder: string,
            mention: MentionConfig,
            codeBlock: {
                languages: CKCodeBlockLanguage[]
            },
            math: {
                engine: string,
                outputType: string,
                lazyLoad: () => Promise<void>,
                forceOutputType: boolean,
                enablePreview: boolean
            },
            mermaid: {
                lazyLoad: () => Promise<Mermaid>,
                config: MermaidConfig
            }
        });
        destroy();
    }

    var CKEditor: {
        BalloonEditor: CKEditorInstance;
        DecoupledEditor: CKEditorInstance;
        EditorWatchdog: typeof CKWatchdog;
    };

    var CKEditorInspector: {
        attach(editor: TextEditor);
    };

    interface CodeMirrorOpts {
        value: string;
        viewportMargin: number;
        indentUnit: number;
        matchBrackets: boolean;
        matchTags: { bothTags: boolean };
        highlightSelectionMatches: {
            showToken: boolean;
            annotateScrollbar: boolean;
        };
        lineNumbers: boolean;
        lineWrapping: boolean;
        keyMap?: "vim" | "default";
        lint?: boolean;
        gutters?: string[];
        tabindex?: number;
        dragDrop?: boolean;
        placeholder?: string;
        readOnly?: boolean;
    }

    var CodeMirror: {
        (el: HTMLElement, opts: CodeMirrorOpts): CodeMirrorInstance;
        keyMap: {
            default: Record<string, string>;
        };
        modeURL: string;
        modeInfo: ModeInfo[];
        findModeByMIME(mime: string): ModeInfo;
        autoLoadMode(instance: CodeMirrorInstance, mode: string)
        registerHelper(type: string, filter: string | null, callback: (text: string, options: object) => unknown);
        Pos(line: number, col: number);
    }

    interface ModeInfo {
        name: string;
        mode: string;
        mime: string;
        mimes: string[];
    }

    interface CodeMirrorInstance {
        getValue(): string;
        setValue(val: string);
        clearHistory();
        setOption(name: string, value: string);
        refresh();
        focus();
        getCursor(): { line: number, col: number, ch: number };
        setCursor(line: number, col: number);
        getSelection(): string;
        lineCount(): number;
        on(event: string, callback: () => void);
        operation(callback: () => void);
        scrollIntoView(pos: number);
        doc: {
            getValue(): string;
            markText(
                from: { line: number, ch: number } | number,
                to: { line: number, ch: number } | number,
                opts: {
                    className: string
                });
            setSelection(from: number, to: number);
            replaceRange(text: string, from: number, to: number);
        }
    }

    var katex: {
        renderToString(text: string, opts: {
            throwOnError: boolean
        });
    }

    interface Range {
        toJSON(): object;
        getItems(): TextNode[];
    }
    interface Writer {
        setAttribute(name: string, value: string, el: CKNode);
        createPositionAt(el: CKNode, opt?: "end" | number);
        setSelection(pos: number, pos?: number);
        insertText(text: string, opts: Record<string, unknown> | undefined | TextPosition, position?: TextPosition);
        addMarker(name: string, opts: {
            range: Range;
            usingOperation: boolean;
        });
        removeMarker(name: string);
        createRange(start: number, end: number): Range;
        createElement(type: string, opts: Record<string, string | null | undefined>);
    }
    interface TextNode {
        previousSibling?: TextNode;
        name: string;
        data: string;
        startOffset: number;
        _attrs: {
            get(key: string): {
                length: number
            }
        }
    }
    interface TextPosition {
        textNode: TextNode;
        offset: number;
        compareWith(pos: TextPosition): string;
    }

    interface TextRange {

    }

    interface Marker {
        name: string;
    }

    interface CKNode {
        name: string;
        childCount: number;
        isEmpty: boolean;
        toJSON(): object;
        is(type: string, name?: string);
        getAttribute(name: string): string;
        getChild(index: number): CKNode;
        data: string;
        startOffset: number;
        root: {
            document: {
                model: {
                    createRangeIn(el: CKNode): TextRange;
                    markers: {
                        getMarkersIntersectingRange(range: TextRange): Marker[];
                    }
                }
            }
        };
    }

    interface CKEvent {
        stop(): void;
    }

    interface PluginEventData {
        title: string;
        message: {
            message: string;
        };
    }

    interface TextEditor {
        create(el: HTMLElement, config: {
            removePlugins?: string[];
            toolbar: {
                items: any[];
            },
            placeholder: string;
            mention: MentionConfig
        });
        enableReadOnlyMode(reason: string);
        model: {
            document: {
                on(event: string, cb: () => void);
                getRoot(): CKNode;
                registerPostFixer(callback: (writer: Writer) => boolean);
                selection: {
                    getFirstPosition(): undefined | TextPosition;
                    getLastPosition(): undefined | TextPosition;
                    getSelectedElement(): CKNode;
                    hasAttribute(attribute: string): boolean;
                    getAttribute(attribute: string): string;
                    getFirstRange(): Range;
                    isCollapsed: boolean;
                };
                differ: {
                    getChanges(): {
                        type: string;
                        name: string;
                        position: {
                            nodeAfter: CKNode;
                            parent: CKNode;
                            toJSON(): Object;
                        }
                    }[];
                }
            },
            insertContent(modelFragment: any, selection?: any);
            change(cb: (writer: Writer) => void)
        },
        editing: {
            view: {
                document: {
                    on(event: string, cb: (event: CKEvent, data: {
                        preventDefault();
                    }) => void, opts?: {
                        priority: "high"
                    });
                    getRoot(): CKNode
                },
                domRoots: {
                    values: () => {
                        next: () => {
                            value: string;
                        }
                    };
                }
                change(cb: (writer: Writer) => void);
                scrollToTheSelection(): void;
                focus(): void;
            }
        },
        plugins: {
            get(command: string)
        },
        data: {
            processor: {
                toView(html: string);
            };
            toModel(viewFeragment: any);
        },
        conversion: {
            for(filter: string): {
                markerToHighlight(data: {
                    model: string;
                    view: (data: {
                        markerName: string;
                    }) => void;
                })
            }
        }
        getData(): string;
        setData(data: string): void;
        getSelectedHtml(): string;
        removeSelection(): void;
        execute<T>(action: string, ...args: unknown[]): T;
        focus(): void;
        sourceElement: HTMLElement;
    }

    interface EditingState {
        highlightedResult: string;
        results: unknown[];
    }

    interface CKFindResult {
        results: {
            get(number): {
                marker: {
                    getStart(): TextPosition;
                    getRange(): number;
                };
            }
        } & [];
    }

    interface MentionItem {
        action?: string;
        noteTitle?: string;
        id: string;
        name: string;
        link?: string;
        notePath?: string;
        highlightedNotePathTitle?: string;
    }

    interface MentionConfig {
        feeds: {
            marker: string;
            feed: (queryText: string) => MentionItem[] | Promise<MentionItem[]>;
            itemRenderer?: (item: {
                highlightedNotePathTitle: string
            }) => void;
            minimumCharacters: number;
        }[];
    }

    /*
     * Panzoom
     */

    function panzoom(el: HTMLElement, opts: {
        maxZoom: number,
        minZoom: number,
        smoothScroll: false,
        filterKey: (e: { altKey: boolean }, dx: number, dy: number, dz: number) => void;
    });

    interface PanZoom {
        zoomTo(x: number, y: number, scale: number);
        moveTo(x: number, y: number);
        on(event: string, callback: () => void);
        getTransform(): unknown;
        dispose(): void;
    }
}
