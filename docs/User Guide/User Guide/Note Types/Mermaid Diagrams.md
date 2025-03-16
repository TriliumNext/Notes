# Mermaid Diagrams
Trilium supports Mermaid, which adds support for various diagrams such as flowchart, sequence diagram, class diagram, state diagram, pie charts, etc., all using a text description of the chart instead of manually drawing the diagram.

For the official documentation of Mermaid.js see [mermaid.js.org/intro/](https://mermaid.js.org/intro/).

## ELK layout engine

Mermaid supports a different layout engine which supports slightly more complex diagrams, called the [Eclipse Layout Kernel (ELK)](https://eclipse.dev/elk/). Trilium has support for these as well, but it's not enabled by default.

In order to activate ELK for any diagram, insert the following YAML frontmatter right at the beginning of the diagram:

```yaml
---
config:
  layout: elk
---
```

| With ELK off | With ELK on |
| --- | --- |
| ![](Mermaid%20Diagrams/ELK%20off.txt) | ![](Mermaid%20Diagrams/ELK%20on.txt) |