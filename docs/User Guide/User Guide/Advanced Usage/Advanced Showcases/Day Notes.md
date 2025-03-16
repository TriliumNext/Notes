# Day Notes
A common pattern in note-taking is that a lot of notes will be centered around a certain date - e.g. you have some tasks which needs to be done on a certain date, you have meeting minutes from a certain date, you have your thoughts etc. and it all revolves around a date on which they occurred. For this reason, it makes sense to create a certain "day workspace" which will centralize all those notes relevant for a certain date.

For this, Trilium provides a concept of "day note". Trilium semi-automatically generates a single note for each day. Under this note you can save all those relevant notes.

Select an existing day note, and the menubar contains a calendar widget. Select any day to create a note for that day. 

![](1_Day%20Notes_image.png)

This pattern works well also because of [Cloning Notes](../../Basic%20Concepts/Note/Cloning%20Notes.md) functionality - note can appear in multiple places in the note tree, so besides appearing under day note, it can also be categorized into other notes.

## Demo

![](Day%20Notes_image.png)

You can see the structure of day notes appearing under "Journal" note - there's a note for the whole year 2017, under it, you have "12 - December" which then contains "18 - Monday". This is our "day note" which contains some text in its content and also has some child notes (some of them are from [Task manager](Task%20Manager.md)).

You can also notice how this day note has [promoted attribute](../Attributes/Promoted%20Attributes.md) "weight" where you can track your daily weight. This data is then used in [Weight tracker](Weight%20Tracker.md).

## Templates

Trilium provides [template](../Attributes/Template.md) functionality, and it could be used together with day notes.

You can define one of the following relations on the root of the journal (identified by `#calendarRoot` label):

*   yearTemplate
*   monthTemplate
*   dateTemplate

All of these are relations. When Trilium creates a new note for year or month or date, it will take a look at the root and attach a corresponding `~template` relation to the newly created role. Using this, you can e.g. create your daily template with e.g. checkboxes for daily routine etc.

## Date pattern

It's possible to customize the title of generated date notes by defining a `#datePattern` label on a root calendar note (identified by `#calendarRoot` label). Following are possible values:

*   `{dayInMonthPadded} - {weekDay}` day notes are named e.g. "24 - Monday"
*   `{dayInMonthPadded}: {weekDay3}` day notes are named e.g. "24: Mon"
*   `{dayInMonthPadded}: {weekDay2}` day notes are named e.g. "24: Mo"
*   `{isoDate} - {weekDay}` day notes are named e.g. "2020-12-24 - Monday"
*   `{ordinal}` is replaced with the ordinal date (e.g. 1st, 2nd, 3rd) etc.

## Month pattern

It is also possible to customize the title of generated month notes through the `#monthPattern` attribute, much like `#datePattern`. The options are:

*   `{monthNumberPadded}` results in a number like `09` for September, and `11` for November
*   `{month}` results in the full month name (e.g. `September` or `October`)
*   `{shortMonth3}` is replaced with the first 3 letters of the month, e.g. Jan, Feb, etc.
*   `{shortMonth4}` is replaced with the first 4 letters of the month, e.g. Sept, Octo, etc.

The default is `{monthNumberPadded} - {month}`

## Implementation

Trilium has some special support for day notes in the form of [backend Script API](https://triliumnext.github.io/Notes/backend_api/BackendScriptApi.html) - see e.g. getDayNote() function.

Day (and year, month) notes are created with a label - e.g. `#dateNote="2018-08-16"` this can then be used by other scripts to add new notes to day note etc.

Journal also has relation `child:child:child:template=Day template` (see \[\[attribute inheritance\]\]) which effectively adds \[\[template\]\] to day notes (grand-grand-grand children of Journal).