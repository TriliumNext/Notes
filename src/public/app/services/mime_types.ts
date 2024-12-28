import options from "./options.js";

/**
 * A pseudo-MIME type which is used in the editor to automatically determine the language used in code blocks via heuristics.
 */
const MIME_TYPE_AUTO = "text-x-trilium-auto";

/**
 * For highlight.js-supported languages, see https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md.
 */

interface MimeTypeDefinition {
    default?: boolean;
    title: string;
    mime: string;
    /** The name of the language/mime type as defined by highlight.js (or one of the aliases), in order to be used for syntax highlighting such as inside code blocks. */
    highlightJs?: string;
    /** If specified, will load the corresponding highlight.js file from the `libraries/highlightjs/${id}.js` instead of `node_modules/@highlightjs/cdn-assets/languages/${id}.min.js`. */
    highlightJsSource?: "libraries";
    /** If specified, will load the corresponding highlight file from the given path instead of `node_modules`. */
    codeMirrorSource?: string;
}

interface MimeType extends MimeTypeDefinition {
    enabled: boolean
}

const MIME_TYPES_DICT: MimeTypeDefinition[] = [
    { default: true, title: "Plain text", mime: "text/plain", highlightJs: "plaintext" },
    { title: "APL", mime: "text/apl" },
    { title: "ASN.1", mime: "text/x-ttcn-asn" },
    { title: "ASP.NET", mime: "application/x-aspx" },
    { title: "Asterisk", mime: "text/x-asterisk" },
    { title: "Batch file (DOS)", mime: "application/x-bat", highlightJs: "dos", codeMirrorSource: "libraries/codemirror/batch.js" },
    { title: "Brainfuck", mime: "text/x-brainfuck", highlightJs: "brainfuck" },
    { default: true, title: "C", mime: "text/x-csrc", highlightJs: "c" },
    { default: true, title: "C#", mime: "text/x-csharp", highlightJs: "csharp" },
    { default: true, title: "C++", mime: "text/x-c++src", highlightJs: "cpp" },
    { title: "Clojure", mime: "text/x-clojure", highlightJs: "clojure" },
    { title: "ClojureScript", mime: "text/x-clojurescript" },
    { title: "Closure Stylesheets (GSS)", mime: "text/x-gss" },
    { title: "CMake", mime: "text/x-cmake", highlightJs: "cmake" },
    { title: "Cobol", mime: "text/x-cobol" },
    { title: "CoffeeScript", mime: "text/coffeescript", highlightJs: "coffeescript" },
    { title: "Common Lisp", mime: "text/x-common-lisp", highlightJs: "lisp" },
    { title: "CQL", mime: "text/x-cassandra" },
    { title: "Crystal", mime: "text/x-crystal", highlightJs: "crystal" },
    { default: true, title: "CSS", mime: "text/css", highlightJs: "css" },
    { title: "Cypher", mime: "application/x-cypher-query" },
    { title: "Cython", mime: "text/x-cython" },
    { title: "D", mime: "text/x-d", highlightJs: "d" },
    { title: "Dart", mime: "application/dart", highlightJs: "dart" },
    { title: "diff", mime: "text/x-diff", highlightJs: "diff" },
    { title: "Django", mime: "text/x-django", highlightJs: "django" },
    { title: "Dockerfile", mime: "text/x-dockerfile", highlightJs: "dockerfile" },
    { title: "DTD", mime: "application/xml-dtd" },
    { title: "Dylan", mime: "text/x-dylan" },
    { title: "EBNF", mime: "text/x-ebnf", highlightJs: "ebnf" },
    { title: "ECL", mime: "text/x-ecl" },
    { title: "edn", mime: "application/edn" },
    { title: "Eiffel", mime: "text/x-eiffel" },
    { title: "Elm", mime: "text/x-elm", highlightJs: "elm" },
    { title: "Embedded Javascript", mime: "application/x-ejs" },
    { title: "Embedded Ruby", mime: "application/x-erb", highlightJs: "erb" },
    { title: "Erlang", mime: "text/x-erlang", highlightJs: "erlang" },
    { title: "Esper", mime: "text/x-esper" },
    { title: "F#", mime: "text/x-fsharp", highlightJs: "fsharp" },
    { title: "Factor", mime: "text/x-factor" },
    { title: "FCL", mime: "text/x-fcl" },
    { title: "Forth", mime: "text/x-forth" },
    { title: "Fortran", mime: "text/x-fortran", highlightJs: "fortran" },
    { title: "Gas", mime: "text/x-gas" },
    { title: "Gherkin", mime: "text/x-feature", highlightJs: "gherkin" },
    { title: "GitHub Flavored Markdown", mime: "text/x-gfm", highlightJs: "markdown" },
    { default: true, title: "Go", mime: "text/x-go", highlightJs: "go" },
    { default: true, title: "Groovy", mime: "text/x-groovy", highlightJs: "groovy" },
    { title: "HAML", mime: "text/x-haml", highlightJs: "haml" },
    { default: true, title: "Haskell", mime: "text/x-haskell", highlightJs: "haskell" },
    { title: "Haskell (Literate)", mime: "text/x-literate-haskell" },
    { title: "Haxe", mime: "text/x-haxe", highlightJs: "haxe" },
    { default: true, title: "HTML", mime: "text/html", highlightJs: "xml" },
    { default: true, title: "HTTP", mime: "message/http", highlightJs: "http" },
    { title: "HXML", mime: "text/x-hxml" },
    { title: "IDL", mime: "text/x-idl" },
    { default: true, title: "Java", mime: "text/x-java", highlightJs: "java" },
    { title: "Java Server Pages", mime: "application/x-jsp", highlightJs: "java" },
    { title: "Jinja2", mime: "text/jinja2" },
    { default: true, title: "JS backend", mime: "application/javascript;env=backend", highlightJs: "javascript" },
    { default: true, title: "JS frontend", mime: "application/javascript;env=frontend", highlightJs: "javascript" },
    { default: true, title: "JSON", mime: "application/json", highlightJs: "json" },
    { title: "JSON-LD", mime: "application/ld+json", highlightJs: "json" },
    { title: "JSX", mime: "text/jsx", highlightJs: "javascript" },
    { title: "Julia", mime: "text/x-julia", highlightJs: "julia" },
    { default: true, title: "Kotlin", mime: "text/x-kotlin", highlightJs: "kotlin" },
    { title: "LaTeX", mime: "text/x-latex", highlightJs: "latex" },
    { title: "LESS", mime: "text/x-less", highlightJs: "less" },
    { title: "LiveScript", mime: "text/x-livescript", highlightJs: "livescript" },
    { title: "Lua", mime: "text/x-lua", highlightJs: "lua" },
    { title: "MariaDB SQL", mime: "text/x-mariadb", highlightJs: "sql" },
    { default: true, title: "Markdown", mime: "text/x-markdown", highlightJs: "markdown" },
    { title: "Mathematica", mime: "text/x-mathematica", highlightJs: "mathematica" },
    { title: "mbox", mime: "application/mbox" },
    { title: "mIRC", mime: "text/mirc" },
    { title: "Modelica", mime: "text/x-modelica" },
    { title: "MS SQL", mime: "text/x-mssql", highlightJs: "sql" },
    { title: "mscgen", mime: "text/x-mscgen" },
    { title: "msgenny", mime: "text/x-msgenny" },
    { title: "MUMPS", mime: "text/x-mumps" },
    { title: "MySQL", mime: "text/x-mysql", highlightJs: "sql" },
    { title: "Nginx", mime: "text/x-nginx-conf", highlightJs: "nginx" },
    { title: "NSIS", mime: "text/x-nsis", highlightJs: "nsis" },
    { title: "NTriples", mime: "application/n-triples" },
    { title: "Objective-C", mime: "text/x-objectivec", highlightJs: "objectivec" },
    { title: "OCaml", mime: "text/x-ocaml", highlightJs: "ocaml" },
    { title: "Octave", mime: "text/x-octave" },
    { title: "Oz", mime: "text/x-oz" },
    { title: "Pascal", mime: "text/x-pascal", highlightJs: "delphi" },
    { title: "PEG.js", mime: "null" },
    { default: true, title: "Perl", mime: "text/x-perl" },
    { title: "PGP", mime: "application/pgp" },
    { default: true, title: "PHP", mime: "text/x-php" },
    { title: "Pig", mime: "text/x-pig" },
    { title: "PLSQL", mime: "text/x-plsql", highlightJs: "sql" },
    { title: "PostgreSQL", mime: "text/x-pgsql", highlightJs: "pgsql" },
    { title: "PowerShell", mime: "application/x-powershell", highlightJs: "powershell" },
    { title: "Properties files", mime: "text/x-properties", highlightJs: "properties" },
    { title: "ProtoBuf", mime: "text/x-protobuf", highlightJs: "protobuf" },
    { title: "Pug", mime: "text/x-pug" },
    { title: "Puppet", mime: "text/x-puppet", highlightJs: "puppet" },
    { default: true, title: "Python", mime: "text/x-python", highlightJs: "python" },
    { title: "Q", mime: "text/x-q", highlightJs: "q" },
    { title: "R", mime: "text/x-rsrc", highlightJs: "r" },
    { title: "reStructuredText", mime: "text/x-rst" },
    { title: "RPM Changes", mime: "text/x-rpm-changes" },
    { title: "RPM Spec", mime: "text/x-rpm-spec" },
    { default: true, title: "Ruby", mime: "text/x-ruby", highlightJs: "ruby" },
    { title: "Rust", mime: "text/x-rustsrc", highlightJs: "rust" },
    { title: "SAS", mime: "text/x-sas", highlightJs: "sas" },
    { title: "Sass", mime: "text/x-sass" },
    { title: "Scala", mime: "text/x-scala" },
    { title: "Scheme", mime: "text/x-scheme" },
    { title: "SCSS", mime: "text/x-scss", highlightJs: "scss" },
    { default: true, title: "Shell (bash)", mime: "text/x-sh", highlightJs: "bash" },
    { title: "Sieve", mime: "application/sieve" },
    { title: "Slim", mime: "text/x-slim" },
    { title: "Smalltalk", mime: "text/x-stsrc", highlightJs: "smalltalk" },
    { title: "Smarty", mime: "text/x-smarty" },
    { title: "SML", mime: "text/x-sml", highlightJs: "sml" },
    { title: "Solr", mime: "text/x-solr" },
    { title: "Soy", mime: "text/x-soy" },
    { title: "SPARQL", mime: "application/sparql-query" },
    { title: "Spreadsheet", mime: "text/x-spreadsheet" },
    { default: true, title: "SQL", mime: "text/x-sql", highlightJs: "sql" },
    { title: "SQLite", mime: "text/x-sqlite", highlightJs: "sql" },
    { default: true, title: "SQLite (Trilium)", mime: "text/x-sqlite;schema=trilium", highlightJs: "sql" },
    { title: "Squirrel", mime: "text/x-squirrel" },
    { title: "sTeX", mime: "text/x-stex" },
    { title: "Stylus", mime: "text/x-styl", highlightJs: "stylus" },
    { default: true, title: "Swift", mime: "text/x-swift" },
    { title: "SystemVerilog", mime: "text/x-systemverilog" },
    { title: "Tcl", mime: "text/x-tcl", highlightJs: "tcl" },
    { title: "Terraform (HCL)", mime: "text/x-hcl", highlightJs: "terraform", highlightJsSource: "libraries", codeMirrorSource: "libraries/codemirror/hcl.js" },
    { title: "Textile", mime: "text/x-textile" },
    { title: "TiddlyWiki ", mime: "text/x-tiddlywiki" },
    { title: "Tiki wiki", mime: "text/tiki" },
    { title: "TOML", mime: "text/x-toml", highlightJs: "ini" },
    { title: "Tornado", mime: "text/x-tornado" },
    { title: "troff", mime: "text/troff" },
    { title: "TTCN", mime: "text/x-ttcn" },
    { title: "TTCN_CFG", mime: "text/x-ttcn-cfg" },
    { title: "Turtle", mime: "text/turtle" },
    { title: "Twig", mime: "text/x-twig", highlightJs: "twig" },
    { title: "TypeScript", mime: "application/typescript", highlightJs: "typescript" },
    { title: "TypeScript-JSX", mime: "text/typescript-jsx" },
    { title: "VB.NET", mime: "text/x-vb", highlightJs: "vbnet" },
    { title: "VBScript", mime: "text/vbscript", highlightJs: "vbscript" },
    { title: "Velocity", mime: "text/velocity" },
    { title: "Verilog", mime: "text/x-verilog", highlightJs: "verilog" },
    { title: "VHDL", mime: "text/x-vhdl", highlightJs: "vhdl" },
    { title: "Vue.js Component", mime: "text/x-vue" },
    { title: "Web IDL", mime: "text/x-webidl" },
    { default: true, title: "XML", mime: "text/xml", highlightJs: "xml" },
    { title: "XQuery", mime: "application/xquery", highlightJs: "xquery" },
    { title: "xu", mime: "text/x-xu" },
    { title: "Yacas", mime: "text/x-yacas" },
    { default: true, title: "YAML", mime: "text/x-yaml", highlightJs: "yaml" },
    { title: "Z80", mime: "text/x-z80" }
];

let mimeTypes: MimeType[] | null = null;

function loadMimeTypes() {
    mimeTypes = JSON.parse(JSON.stringify(MIME_TYPES_DICT)) as MimeType[]; // clone

    const enabledMimeTypes = options.getJson('codeNotesMimeTypes')
        || MIME_TYPES_DICT.filter(mt => mt.default).map(mt => mt.mime);

    for (const mt of mimeTypes) {
        mt.enabled = enabledMimeTypes.includes(mt.mime) || mt.mime === 'text/plain'; // text/plain is always enabled
    }
}

function getMimeTypes(): MimeType[] {
    if (mimeTypes === null) {
        loadMimeTypes();
    }

    return mimeTypes as MimeType[];
}

let mimeToHighlightJsMapping: Record<string, string> | null = null;

/**
 * Obtains the corresponding language tag for highlight.js for a given MIME type.
 *
 * The mapping is built the first time this method is built and then the results are cached for better performance.
 *
 * @param mimeType The MIME type of the code block, in the CKEditor-normalized format (e.g. `text-c-src` instead of `text/c-src`).
 * @returns the corresponding highlight.js tag, for example `c` for `text-c-src`.
 */
function getHighlightJsNameForMime(mimeType: string) {
    if (!mimeToHighlightJsMapping) {
        const mimeTypes = getMimeTypes();
        mimeToHighlightJsMapping = {};
        for (const mimeType of mimeTypes) {
            // The mime stored by CKEditor is text-x-csrc instead of text/x-csrc so we keep this format for faster lookup.
            const normalizedMime = normalizeMimeTypeForCKEditor(mimeType.mime);
            if (mimeType.highlightJs) {
                mimeToHighlightJsMapping[normalizedMime] = mimeType.highlightJs;
            }
        }
    }

    return mimeToHighlightJsMapping[mimeType];
}

/**
 * Given a MIME type in the usual format (e.g. `text/csrc`), it returns a MIME type that can be passed down to the CKEditor
 * code plugin.
 *
 * @param mimeType The MIME type to normalize, in the usual format (e.g. `text/c-src`).
 * @returns the normalized MIME type (e.g. `text-c-src`).
 */
function normalizeMimeTypeForCKEditor(mimeType: string) {
    return mimeType.toLowerCase()
        .replace(/[\W_]+/g,"-");
}

export default {
    MIME_TYPE_AUTO,
    getMimeTypes,
    loadMimeTypes,
    getHighlightJsNameForMime,
    normalizeMimeTypeForCKEditor
}
