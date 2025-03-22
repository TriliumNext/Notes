# Bulk actions
### Execute script

For more complex scenarios, it is possible to type in a JavaScript expression in order to apply the necessary changes.

To apply a suffix (`- suffix` in this example), to the note title:

```javascript
note.title = note.title + " - suffix";
```

To alter attributes of a note in a bulk action, such as setting the `#shareAlias` label to the title of the note:

```javascript
note.setLabel("shareAlias", note.title)
```