import toastService from "./toast.js";

function copyImageReferenceToClipboard($imageWrapper) {
    try {
        $imageWrapper.attr('contenteditable', 'true');
        selectImage($imageWrapper.get(0));

        const success = document.execCommand('copy');

        if (success) {
            toastService.showMessage("A reference to the image has been copied to clipboard. This can be pasted in any text note.");
        } else {
            toastService.showAndLogError("Could not copy the image reference to clipboard.");
        }
    }
    finally {
        window.getSelection().removeAllRanges();
        $imageWrapper.removeAttr('contenteditable');
    }
}

function selectImage(element) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

export default {
    copyImageReferenceToClipboard
};
