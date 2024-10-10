import utils from "../services/utils.js";
import contextMenu from "./context_menu.js";
import imageService from "../services/image.js";

const PROP_NAME = "imageContextMenuInstalled";

function setupContextMenu($image) {
    if (!utils.isElectron() || $image.prop(PROP_NAME)) {
        return;
    }

    $image.prop(PROP_NAME, true);
    $image.on('contextmenu', e => {
        e.preventDefault();

        contextMenu.show({
            x: e.pageX,
            y: e.pageY,
            items: [
                {
                    title: "Copy reference to clipboard",
                    command: "copyImageReferenceToClipboard",
                    uiIcon: "bx bx-empty"
                },
                { title: "Copy image to clipboard", command: "copyImageToClipboard", uiIcon: "bx bx-empty" },
            ],
            selectMenuItemHandler: async ({ command }) => {
                if (command === 'copyImageReferenceToClipboard') {
                    imageService.copyImageReferenceToClipboard($image);
                } else if (command === 'copyImageToClipboard') {
                    try {
                        const nativeImage = utils.dynamicRequire('electron').nativeImage;
                        const clipboard = utils.dynamicRequire('electron').clipboard;

                        const response = await fetch(
                            $image.attr('src')
                        );
                        const blob = await response.blob();

                        clipboard.writeImage(
                            nativeImage.createFromBuffer(
                                Buffer.from(
                                    await blob.arrayBuffer()
                                )
                            )
                        );
                    } catch (error) {
                        console.error('Failed to copy image to clipboard:', error);
                    }
                } else {
                    throw new Error(`Unrecognized command '${command}'`);
                }
            }
        });
    });
}

export default {
    setupContextMenu
};