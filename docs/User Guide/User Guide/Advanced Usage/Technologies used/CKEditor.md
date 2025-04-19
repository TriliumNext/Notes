# CKEditor
## Editor core

The CKEditor is the WYSIWYG (standing for What You See Is What You Get) editor behind [Text](../../Note%20Types/Text.md) notes.

Their website is [ckeditor.com](https://ckeditor.com/).

CKEditor by itself is a commercial product, but the core is open-source. As described in [its documentation](https://ckeditor.com/docs/ckeditor5/latest/features/index.html), the editor supports quite a large number of features. Do note that not all the features are enabled in Trilium.

## Premium features

Some features are marked as premium in the CKEditor feature set. This means that they cannot be used without a license.

Trilium cannot benefit from any of these premium features as they require a commercial license, however we are in discussions with the CKEditor team to allow us to use a subset of these premium features such as [Slash commands](https://ckeditor.com/docs/ckeditor5/latest/features/slash-commands.html).

## Plugins

The CKEditor ecosystem is quite extensible, in the sense that custom plugins can be written to extend the functionality of the editor beyond its original scope.

Trilium makes use of such features:

*   The math feature is added by a version of [isaul32/ckeditor5-math: Math feature for CKEditor 5.](https://github.com/isaul32/ckeditor5-math) modified by us to fit our needs.
*   We also make use of modified upstream plugins such as [ckeditor/ckeditor5-mermaid](https://github.com/ckeditor/ckeditor5-mermaid) to allow inline Mermaid code.
*   [mlewand/ckeditor5-keyboard-marker: Plugin adds support for the keyboard input element (`<kbd>`) to CKEditor 5.](https://github.com/mlewand/ckeditor5-keyboard-marker)
*   A modified version of [ThomasAitken/ckeditor5-footnotes: Footnotes plugin for CKEditor5](https://github.com/ThomasAitken/ckeditor5-footnotes) to allow footnotes.

Apart from that, Trilium also has its own set of specific plugins such as:

*   <a class="reference-link" href="../../Note%20Types/Text/Cut%20to%20subnote.md">Cut to subnote</a>
*   <a class="reference-link" href="../../Note%20Types/Text/Include%20Note.md">Include Note</a>
*   Mentions, for linking pages.
*   <a class="reference-link" href="../../Basic%20Concepts%20and%20Features/Import%20%26%20Export/Markdown.md">Markdown</a>
*   [Reference links](../../Note%20Types/Text/Links.md)
*   [Admonitions](../../Note%20Types/Text/Block%20quotes%20%26%20admonitions.md), we ended up creating our own plugin but [aarkue/ckeditor5-admonition](https://github.com/aarkue/ckeditor5-admonition) was a good inspiration (including the toolbar icon).