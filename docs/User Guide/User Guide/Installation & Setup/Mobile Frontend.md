# Mobile Frontend
Trilium ([server edition](Server%20Installation.md)) has a mobile web frontend which is optimized for touch based devices - smartphones and tablets. It is activated automatically during login process based on browser detection.

Mobile frontend is limited in features compared to full desktop frontend. See below for more details on this.

Note that this is not an Android/iOS app, this is just mobile friendly web page served on the [server edition](Server%20Installation.md).

## Screenshots

### Mobile phone

![](../Attachments/mobile-smartphone.png)

### Tablet

![](../Attachments/mobile-tablet.png)

## Limitations

Mobile frontend provides only some of the features of the full desktop frontend:

*   it is possible to browse the whole note tree, read and edit all types of notes, but you can create only text notes
*   reading and editing [protected notes](../Basic%20Concepts%20and%20Features/Notes/Protected%20Notes.md) is possible, but creating them is not supported
*   editing options is not supported
*   cloning notes is not supported
*   uploading file attachments is not supported

## Forcing mobile/desktop frontend

Trilium decides automatically whether to use mobile or desktop frontend. If this is not appropriate, you can use `?mobile` or `?desktop` query param on **login** page (Note: you might need to log out).

## Scripting

You can alter the behavior with [scripts](../Note%20Types/Code/Scripts.md) just like for normal frontend. For script notes to be executed, they need to have labeled `#run=mobileStartup`.