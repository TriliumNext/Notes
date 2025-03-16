# Search
## Local Search

Local search allows you to search within the currently displayed note. To initiate a local search, press <kbd>Ctrl</kbd> + <kbd>F</kbd>. If using a web browser, this will be handled by the browser's native search functionality. In the desktop (electron) version, a separate dialog will apear.

## Note Search

Note search enables you to find notes by searching for text in the title, content, or [attributes](../../Advanced%20Usage/Attributes.md) of the notes. You also have the option to save your searches, which will create a special search note which is visible on your navigation tree and contains the search results as sub-items.

To search for notes, click on the magnifying glass icon on the toolbar or press the <kbd>Ctrl</kbd> + <kbd>S</kbd> keyboard [shortcut](../Keyboard%20Shortcuts.md).

### Simple Note Search Examples

*   `rings tolkien`: Full-text search to find notes containing both "rings" and "tolkien".
*   `"The Lord of the Rings" Tolkien`: Full-text search where "The Lord of the Rings" must match exactly.
*   `note.content *=* rings OR note.content *=* tolkien`: Find notes containing "rings" or "tolkien" in their content.
*   `towers #book`: Combine full-text and attribute search to find notes containing "towers" and having the "book" label.
*   `towers #book or #author`: Search for notes containing "towers" and having either the "book" or "author" label.
*   `towers #!book`: Search for notes containing "towers" and not having the "book" label.
*   `#book #publicationYear = 1954`: Find notes with the "book" label and "publicationYear" set to 1954.
*   `#genre *=* fan`: Find notes with the "genre" label containing the substring "fan". Additional operators include `*=*` for "contains", `=*` for "starts with", `*=` for "ends with", and `!=` for "is not equal to".
*   `#book #publicationYear >= 1950 #publicationYear < 1960`: Use numeric operators to find all books published in the 1950s.
*   `#dateNote >= TODAY-30`: A "smart search" to find notes with the "dateNote" label within the last 30 days. Supported smart values include NOW +- seconds, TODAY +- days, MONTH +- months, YEAR +- years.
*   `~author.title *=* Tolkien`: Find notes related to an author whose title contains "Tolkien".
*   `#publicationYear %= '19[0-9]{2}'`: Use the '%=' operator to match a regular expression (regex). This feature has been available since Trilium 0.52.

### Advanced Use Cases

*   `~author.relations.son.title = 'Christopher Tolkien'`: Search for notes with an "author" relation to a note that has a "son" relation to "Christopher Tolkien". This can be modeled with the following note structure:
    *   Books
        *   Lord of the Rings
            *   label: “book”
            *   relation: “author” points to “J. R. R. Tolkien” note
    *   People
        *   J. R. R. Tolkien
            *   relation: “son” points to "Christopher Tolkien" note
            *   Christopher Tolkien
*   `~author.title *= Tolkien OR (#publicationDate >= 1954 AND #publicationDate <= 1960)`: Use boolean expressions and parentheses to group expressions. Note that expressions starting with a parenthesis need an "expression separator sign" (# or ~) prepended.
*   `note.parents.title = 'Books'`: Find notes with a parent named "Books".
*   `note.parents.parents.title = 'Books'`: Find notes with a grandparent named "Books".
*   `note.ancestors.title = 'Books'`: Find notes with an ancestor named "Books".
*   `note.children.title = 'sub-note'`: Find notes with a child named "sub-note".

### Search with Note Properties

Notes have properties that can be used in searches, such as `noteId`, `dateModified`, `dateCreated`, `isProtected`, `type`, `title`, `text`, `content`, `rawContent`, `ownedLabelCount`, `labelCount`, `ownedRelationCount`, `relationCount`, `ownedRelationCountIncludingLinks`, `relationCountIncludingLinks`, `ownedAttributeCount`, `attributeCount`, `targetRelationCount`, `targetRelationCountIncludingLinks`, `parentCount`, `childrenCount`, `isArchived`, `contentSize`, `noteSize`, and `revisionCount`.

These properties can be accessed via the `note.` prefix, e.g., `note.type = code AND note.mime = 'application/json'`.

### Order by and Limit

```
#author=Tolkien orderBy #publicationDate desc, note.title limit 10
```

This example will:

1.  Find notes with the author label "Tolkien".
2.  Order the results by `publicationDate` in descending order.
3.  Use `note.title` as a secondary ordering if publication dates are equal.
4.  Limit the results to the first 10 notes.

### Negation

Some queries can only be expressed with negation:

```
#book AND not(note.ancestor.title = 'Tolkien')
```

This query finds all book notes not in the "Tolkien" subtree.

## Under the Hood

### Label and Relation Shortcuts

The "full" syntax for searching by labels is:

```
note.labels.publicationYear = 1954
```

For relations:

```
note.relations.author.title *=* Tolkien
```

However, common label and relation searches have shortcut syntax:

```
#publicationYear = 1954
#author.title *=* Tolkien
```

### Separating Full-Text and Attribute Parts

Search syntax allows combining full-text search with attribute-based search seamlessly. For example, `tolkien #book` contains:

1.  Full-text tokens - `tolkien`
2.  Attribute expressions - `#book`

Trilium detects the separation between full text search and attribute/property search by looking for certain special characters or words that denote attributes and properties (e.g., #, ~, note.). If you need to include these in full-text search, escape them with a backslash so they are processed as regular text:

```
"note.txt" 
\#hash 
#myLabel = 'Say "Hello World"'
```

### Escaping Special Characters

Special characters can be enclosed in quotes or escaped with a backslash to be used in full-text search:

```
"note.txt"
\#hash
#myLabel = 'Say "Hello World"'
```

Three types of quotes are supported: single, double, and backtick.

### Type Coercion

Label values are technically strings but can be coerced for numeric comparisons:

```
note.dateCreated =* '2019-05'
```

This finds notes created in May 2019. Numeric operators like `#publicationYear >= 1960` convert string values to numbers for comparison.

## Auto-Trigger Search from URL

You can open Trilium and automatically trigger a search by including the search [url encoded](https://meyerweb.com/eric/tools/dencoder/) string in the URL:

`http://localhost:8080/#?searchString=abc`