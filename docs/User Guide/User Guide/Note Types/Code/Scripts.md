# Scripts
Trilium supports creating [code notes](../Code.md), i.e. notes which allow you to store some programming code and highlight it. Special case is JavaScript code notes which can also be executed inside Trilium which can in conjunction with [Script API](Script%20API.md) provide extra functionality.

## Scripting

To go further I must explain basic architecture of Trilium - in its essence it is a classic web application - it has these two main components:

*   frontend running in the browser (using HTML, CSS, JavaScript) - this is mainly used to interact with the user, display notes etc.
*   backend running JavaScript code in node.js runtime - this is responsible for e.g. storing notes, encrypting them etc.

So we have frontend and backend, each with their own set of responsibilities, but their common feature is that they both run JavaScript code. Add to this the fact, that we're able to create JavaScript \[\[code notes\]\] and we're onto something.

## Button use case

Let's take a look at our demo script (shipped with default Trilium [database](../../Advanced%20Usage/Database.md)) - Task manager. One of the things this script does is adding a button to the Trilium interface which will allow user to easily add new Task (TODO item).

![](../../Attachments/button-script.png)

First take a look at the red circle all the way on the top - this what we want to achieve - new button in UI which will create new note representing a task/todo item.

Red point below the first one marks the note type we have created for this script - it's "JavaScript frontend". It's frontend because adding button to UI is clearly frontend responsibility.

In the note content you can see the code which calls one of the API methods, this one is specifically meant to add new buttons. Code needs to set few button properties:

*   button title
*   icon which should appear on the button
*   optional shortcut under which you can trigger the button
*   most importantly "action" - what must happen when button is clicked

### Action handler

Saving the note to the database is backend's responsibility, so we immediately pass control to the backend and ask it to create a note. Once this is done, we show the newly created note so that the user can set the task title and maybe some attributes.

### Script execution

So we have a script which will add the button to the toolbar. But how can we execute it? One possibility is to click on "play" icon (marked by red circle). The problem with this is that this UI change is time bound by Trilium runtime so when we restart Trilium, button won't be there.

We need to execute it every time Trilium starts up, but we probably don't want to have to manually click on play button on every start up.

The solution is marked by red circle at the bottom - this note has [label](../../Advanced%20Usage/Attributes.md) `#run=frontendStartup` - this is one of the "system" labels which Trilium understands. As you might guess, this will cause all such labeled script notes to be executed once Trilium frontend starts up.

(`#run=frontendStartup` does not work for [Mobile frontend](../../Installation%20%26%20Setup/Mobile%20Frontend.md) - if you want to have scripts running there, give the script `#run=mobileStartup` label)

### More showcases

You can see more scripting with explanation in [Advanced showcases](../../Advanced%20Usage/Advanced%20Showcases.md)

## Events

See [Events](Events.md).

## Script API

See [Script API](Script%20API.md).