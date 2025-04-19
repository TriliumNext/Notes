# Attributes
<figure class="image"><img style="aspect-ratio:1071/146;" src="Attributes_image.png" width="1071" height="146"></figure>

In Trilium, attributes are key-value pairs assigned to notes, providing additional metadata or functionality. There are two primary types of attributes:

1.  <a class="reference-link" href="Attributes/Labels.md">Labels</a> can be used for a variety of purposes, such as storing metadata or configuring the behaviour of notes. Labels are also searchable, enhancing note retrieval.
    
    For more information, including predefined labels, see <a class="reference-link" href="Attributes/Labels.md">Labels</a>.
2.  <a class="reference-link" href="Attributes/Relations.md">Relations</a> define connections between notes, similar to links. These can be used for metadata and scripting purposes.
    
    For more information, including a list of predefined relations, see <a class="reference-link" href="Attributes/Relations.md">Relations</a>.

These attributes play a crucial role in organizing, categorising, and enhancing the functionality of notes.

## Viewing the list of attributes

Both the labels and relations for the current note are displayed in the _Owned Attributes_ section of the <a class="reference-link" href="../Basic%20Concepts%20and%20Features/UI%20Elements/Ribbon.md">Ribbon</a>, where they can be viewed and edited. Inherited attributes are displayed in the _Inherited Attributes_ section of the ribbon, where they can only be viewed.

In the list of attributes, labels are prefixed with the `#` character whereas relations are prefixed with the `~` character.

## Multiplicity

Attributes in Trilium can be "multi-valued", meaning multiple attributes with the same name can co-exist.

## Attribute Definitions and Promoted Attributes

Special labels create "label/attribute" definitions, enhancing the organization and management of attributes. For more details, see <a class="reference-link" href="Attributes/Promoted%20Attributes.md">Promoted Attributes</a>.

## Attribute Inheritance

Trilium supports attribute inheritance, allowing child notes to inherit attributes from their parents. For more information, see <a class="reference-link" href="Attributes/Attribute%20Inheritance.md">Attribute Inheritance</a>.