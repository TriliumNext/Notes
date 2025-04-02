# Images
Trilium supports storing and displaying images. Supported formats are JPEG, PNG and GIF.

An image can be uploaded in the form of note's [attachment](../../Basic%20Concepts%20and%20Features/Notes/Attachments.md) or as a standalone [note](../../Basic%20Concepts%20and%20Features/Navigation/Tree%20Concepts.md) placed into the [note tree](../../Basic%20Concepts%20and%20Features/Navigation/Tree%20Concepts.md). Its reference can be copied into a text note, in order to display it in the text itself.

## Uploading images

To add an image to the note, simply drag it from file explorer onto the note editor inside Trilium and the image will be uploaded.

![](8_Images_image.png)

Alternatively you can click on block toolbar and then on "Insert image":

![](6_Images_image.png)

You can also copy and paste an image from web - the image will be (asynchronously) downloaded and embedded.

## Configuring the images

Clicking on an image will reveal a popup with multiple options:  
![](9_Images_image.png)

### Alignment

The first set of options configure the alignment are, in order:

| Icon | Option | Preview | Description |
| --- | --- | --- | --- |
| ![](5_Images_image.png) | Inline | ![](1_Images_image.png) | As the name suggests, the name can be put inside a paragraph and moved around similarly as if it was a block of text. Use drag & drop or cut-paste to move it around. |
| ![](10_Images_image.png) | Centered image | ![](2_Images_image.png) | The image will be displayed as a block and centered, not allowing text in either the left or right of it. |
| ![](4_Images_image.png) | Wrap text | ![](7_Images_image.png) | The image will be displayed to the left or the right of the text. |
| ![](Images_image.png) | Block align | ![](3_Images_image.png) | Similarly to _Centered image_, the image will be displayed as a block and aligned either to the left or to the right, but not allowing text to flow on either of its sides. |

## Compression

Since Trilium isn't really meant to be primary storage for image data, it attempts to compress and resize (with pretty aggressive settings) uploaded images before storing them to the database. You may then notice some quality degradation. Basic quality settings is available in Options -> Other.

If you want to save images in their original resolution, it is recommended to save them as attachment to note (top-right "Note actions -> Import files").