# Calendar View
<figure class="image image-style-align-center"><img style="aspect-ratio:767/606;" src="4_Calendar View_image.png" width="767" height="606"></figure>

The Calendar view of Book notes will display each child note in a calendar that has a start date and optionally an end date, as an event.

The Calendar view has multiple display modes:

*   Week view, where all the 7 days of the week (or 5 if the weekends are hidden) are displayed in columns. This mode allows entering and displaying time-specific events, not just all-day events.
*   Month view, where the entire month is displayed and all-day events can be inserted. Both time-specific events and all-day events are listed.
*   Year view, which displays the entire year for quick reference.
*   List view, which displays all the events of a given month in sequence.

Unlike other Book view types, the Calendar view also allows some kind of interaction, such as moving events around as well as creating new ones.

## Creating a calendar

<figure class="table"><table><thead><tr><th>&nbsp;</th><th>&nbsp;</th><th>&nbsp;</th></tr></thead><tbody><tr><td>1</td><td><img src="2_Calendar View_image.png"></td><td>The Calendar View works only for Book note types. To create a new note, right click on the note tree on the left and select Insert note after, or Insert child note and then select <em>Book</em>.</td></tr><tr><td>2</td><td><img src="3_Calendar View_image.png"></td><td>Once created, the “View type” of the Book needs changed to “Calendar”, by selecting the “Book Properties” tab in the ribbon.</td></tr></tbody></table></figure>

## Creating a new event/note

*   Clicking on a day will create a new child note and assign it to that particular day.
    *   You will be asked for the name of the new note. If the popup is dismissed by pressing the close button or escape, then the note will not be created.
*   It's possible to drag across multiple days to set both the start and end date of a particular note.  
    ![](Calendar%20View_image.png)
*   Creating new notes from the calendar will respect the `~child:template` relation if set on the book note.

## Interacting with events

*   Hovering the mouse over an event will display information about the note.  
    ![](7_Calendar%20View_image.png)
*   Left clicking the event will go to that note. Middle clicking will open the note in a new tab and right click will offer more options including opening the note in a new split or window.
*   Drag and drop an event on the calendar to move it to another day.
*   The length of an event can be changed by placing the mouse to the right edge of the event and dragging the mouse around.

## Configuring the calendar

The following attributes can be added to the book type:

<figure class="table"><table><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody><tr><td><code>#calendar:hideWeekends</code></td><td>When present (regardless of value), it will hide Saturday and Sundays from the calendar.</td></tr><tr><td><code>#calendar:weekNumbers</code></td><td>When present (regardless of value), it will show the number of the week on the calendar.</td></tr><tr><td><code>#calendar:view</code></td><td><p>Which view to display in the calendar:</p><ul><li><code>timeGridWeek</code> for the <em>week</em> view;</li><li><code>dayGridMonth</code> for the <em>month</em> view;</li><li><code>multiMonthYear</code> for the <em>year</em> view;</li><li><code>listMonth</code> for the <em>list</em> view.</li></ul><p>Any other value will be dismissed and the default view (month) will be used instead.</p><p>The value of this label is automatically updated when changing the view using the UI buttons.</p></td></tr><tr><td><code>~child:template</code></td><td>Defines the template for newly created notes in the calendar (via dragging or clicking).</td></tr></tbody></table></figure>

In addition, the first day of the week can be either Sunday or Monday and can be adjusted from the application settings.

## Configuring the calendar events

For each note of the calendar, the following attributes can be used:

<figure class="table"><table><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody><tr><td><code>#startDate</code></td><td>The date the event starts, which will display it in the calendar. The format is <code>YYYY-MM-DD</code> (year, month and day separated by a minus sign).</td></tr><tr><td><code>#endDate</code></td><td>Similar to <code>startDate</code>, mentions the end date if the event spans across multiple days. The date is inclusive, so the end day is also considered. The attribute can be missing for single-day events.</td></tr><tr><td><code>#startTime</code></td><td>The time the event starts at. If this value is missing, then the event is considered a full-day event. The format is <code>HH:MM</code> (hours in 24-hour format and minutes).</td></tr><tr><td><code>#endTime</code></td><td>Similar to <code>startTime</code>, it mentions the time at which the event ends (in relation with <code>endDate</code> if present, or <code>startDate</code>).</td></tr><tr><td><code>#color</code></td><td>Displays the event with a specified color (named such as <code>red</code>, <code>gray</code> or hex such as <code>#FF0000</code>). This will also change the color of the note in other places such as the note tree.</td></tr><tr><td><code>#calendar:color</code></td><td>Similar to <code>#color</code>, but applies the color only for the event in the calendar and not for other places such as the note tree.</td></tr><tr><td><code>#iconClass</code></td><td>If present, the icon of the note will be displayed to the left of the event title.</td></tr><tr><td><code>#calendar:title</code></td><td>Changes the title of an event to point to an attribute of the note other than the title, can either a label or a relation (without the <code>#</code> or <code>~</code> symbol). See <em>Use-cases</em> for more information.</td></tr><tr><td><code>#calendar:displayedAttributes</code></td><td>Allows displaying the value of one or more attributes in the calendar like this:&nbsp;&nbsp;&nbsp;&nbsp;<br><br><img src="9_Calendar View_image.png"> &nbsp;&nbsp;<br><br><code>#weight="70" #Mood="Good" #calendar:displayedAttributes="weight,Mood"</code>&nbsp;&nbsp;<br><br>It can also be used with relations, case in which it will display the title of the target note:&nbsp;&nbsp;&nbsp;<br><br><code>~assignee=@My assignee #calendar:displayedAttributes="assignee"</code></td></tr><tr><td><code>#calendar:startDate</code></td><td>Allows using a different label to represent the start date, other than <code>startDate</code> (e.g. <code>expiryDate</code>). The label name <strong>must not be</strong> prefixed with <code>#</code>. If the label is not defined for a note, the default will be used instead.</td></tr><tr><td><code>#calendar:endDate</code></td><td>Similar to <code>#calendar:startDate</code>, allows changing the attribute which is being used to read the end date.</td></tr><tr><td><code>#calendar:startTime</code></td><td>Similar to <code>#calendar:startDate</code>, allows changing the attribute which is being used to read the start time.</td></tr><tr><td><code>#calendar:endTime</code></td><td>Similar to <code>#calendar:startDate</code>, allows changing the attribute which is being used to read the end time.</td></tr></tbody></table></figure>

## How the calendar works

![](11_Calendar%20View_image.png)

The calendar displays all the child notes of the book that have a `#startDate`. An `#endDate` can optionally be added.

If editing the start date and end date from the note itself is desirable, the following attributes can be added to the book note:

```
#viewType=calendar #label:startDate(inheritable)="promoted,alias=Start Date,single,date"
#label:endDate(inheritable)="promoted,alias=End Date,single,date"
#hidePromotedAttributes 
```

This will result in:

![](10_Calendar%20View_image.png)

When not used in a Journal, the calendar is recursive. That is, it will look for events not just in its child notes but also in the children of these child notes.

## Use-cases

### Using with the Journal / calendar

It is possible to integrate the calendar view into the Journal with day notes. In order to do so change the note type of the Journal note (calendar root) to Book and then select the Calendar View.

Based on the `#calendarRoot` (or `#workspaceCalendarRoot`) attribute, the calendar will know that it's in a calendar and apply the following:

*   The calendar events are now rendered based on their `dateNote` attribute rather than `startDate`.
*   Interactive editing such as dragging over an empty era or resizing an event is no longer possible.
*   Clicking on the empty space on a date will automatically open that day's note or create it if it does not exist.
*   Direct children of a day note will be displayed on the calendar despite not having a `dateNote` attribute. Children of the child notes will not be displayed.

<img src="8_Calendar View_image.png" width="1217" height="724">

### Using a different attribute as event title

By default, events are displayed on the calendar by their note title. However, it is possible to configure a different attribute to be displayed instead.

To do so, assign `#calendar:title` to the child note (not the calendar/book note), with the value being `name` where `name` can be any label (make not to add the `#` prefix). The attribute can also come through inheritance such as a template attribute. If the note does not have the requested label, the title of the note will be used instead.

<figure class="table" style="width:100%;"><table><thead><tr><th>&nbsp;</th><th>&nbsp;</th></tr></thead><tbody><tr><td><pre><code class="language-text-x-trilium-auto">#startDate=2025-02-11 #endDate=2025-02-13 #name="My vacation" #calendar:title="name"</code></pre></td><td><p>&nbsp;</p><figure class="image image-style-align-center"><img style="aspect-ratio:445/124;" src="5_Calendar View_image.png" width="445" height="124"></figure></td></tr></tbody></table></figure>

### Using a relation attribute as event title

Similarly to using an attribute, use `#calendar:title` and set it to `name` where `name` is the name of the relation to use.

Moreover, if there are more relations of the same name, they will be displayed as multiple events coming from the same note.

<figure class="table" style="width:100%;"><table><thead><tr><th>&nbsp;</th><th>&nbsp;</th></tr></thead><tbody><tr><td><pre><code class="language-text-x-trilium-auto">#startDate=2025-02-14 #endDate=2025-02-15 ~for=@John Smith ~for=@Jane Doe #calendar:title="for"</code></pre></td><td><img src="6_Calendar View_image.png" width="294" height="151"></td></tr></tbody></table></figure>

Note that it's even possible to have a `#calendar:title` on the target note (e.g. “John Smith”) which will try to render an attribute of it. Note that it's not possible to use a relation here as well for safety reasons (an accidental recursion  of attributes could cause the application to loop infinitely).

<figure class="table" style="width:100%;"><table><thead><tr><th>&nbsp;</th><th>&nbsp;</th></tr></thead><tbody><tr><td><pre><code class="language-text-x-trilium-auto">#calendar:title="shortName" #shortName="John S."</code></pre></td><td><figure class="image image-style-align-center"><img style="aspect-ratio:296/150;" src="1_Calendar View_image.png" width="296" height="150"></figure></td></tr></tbody></table></figure>