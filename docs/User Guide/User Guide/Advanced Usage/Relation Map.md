# Relation Map
Relation map is a type of [note](../Basic%20Concepts/Navigation/Tree%20Concepts.md) which visualizes notes and their [relations](Attributes.md). See an example:

## Development process demo

This is a basic example how you can create simple diagram using relation maps:

![](../Attachments/relation-map-dev-process.png)

And this is how you can create it:

![](Relation%20Map_relation-map-.gif)

We start completely from scratch by first creating new note called "Development process" and changing its type to "Relation map". After that we create new notes one by one and place them by clicking into the map. We also drag [relations](Attributes.md)between notes and name them. That's all!

Items on the map - "Specification", "Development", "Testing" and "Demo" are actually notes which have been created under "Development process" note - you can click on them and write some content. Connections between notes are called "[relations](Attributes.md)".

## Family demo

This is more complicated demo using some advanced concepts. Resulting diagram is here:

![](../Attachments/relation-map-family.png)

This is how you get to it:

![](../Attachments/relation-map-family-demo.gif)

There are several steps here:

*   we start with empty relation map and two existing notes representing Prince Philip and Queen Elizabeth II. These two notes already have "isPartnerOf" [relations](Attributes.md)defined.
    *   There are actually two "inverse" relations (one from Philip to Elizabeth and one from Elizabeth to Philip)
*   we drag both notes to relation map and place to suitable position. Notice how the existing "isPartnerOf" relations are displayed.
*   now we create new note - we name it "Prince Charles" and place it on the relation map by clicking on the desired position. The note is by default created under the relation map note (visible in the note tree on the left).
*   we create two new relations "isChildOf" targeting both Philip and Elizabeth
    *   now there's something unexpected - we can also see the relation to display another "hasChild" relation. This is because there's a [relation definition](Attributes/Promoted%20Attributes.md) which puts "isChildOf" as an "[inverse](Attributes/Promoted%20Attributes.md)" relation of "hasChildOf" (and vice versa) and thus it is created automatically.
*   we create another note for Princess Diana and create "isPartnerOf" relation from Charles. Again notice how the relation has arrows both ways - this is because "isPartnerOf" definition specifies its inverse relation as again "isPartnerOf" so the opposite relation is created automatically.
*   as the last step we pan & zoom the map to fit better to window dimensions.

Relation definitions mentioned above come from "Person template" note which is assigned to any child of "My Family Tree" relation note. You can play with the whole thing in the [demo notes](Database.md).

## Details

You can specify which relations should be displayed with comma delimited names of relations in `displayRelations` label.

Alternatively, you can specify comma delimited list of relation names in `hideRelations` which will display all relations, except for the ones defined in the label.

## See also

*   [Note map](Note%20Map.md) is a similar concept