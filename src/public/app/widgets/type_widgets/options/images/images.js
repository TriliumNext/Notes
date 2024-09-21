import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <style>
        .options-section .disabled-field {
            opacity: 0.5;
            pointer-events: none;
        }
    </style>

    <h4>${t("images.images_section_title")}</h4>
    
    <label>
        <input class="download-images-automatically" type="checkbox" name="download-images-automatically">
        ${t("images.download_images_automatically")}
    </label>
    
    <p>${t("images.download_images_description")}</p>
    
    <label>
        <input class="image-compresion-enabled" type="checkbox" name="image-compression-enabled">
        ${t("images.enable_image_compression")}
    </label>

    <div class="image-compression-enabled-wraper">
        <div class="form-group">
            <label>${t("images.max_image_dimensions")}</label>
            <input class="image-max-width-height form-control options-number-input" type="number" min="1">
        </div>
    
        <div class="form-group">
            <label>${t("images.jpeg_quality_description")}</label>
            <input class="image-jpeg-quality form-control options-number-input" min="10" max="100" type="number">
        </div>
    </div>
</div>
`;

export default class ImageOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$imageMaxWidthHeight = this.$widget.find(".image-max-width-height");
        this.$imageJpegQuality = this.$widget.find(".image-jpeg-quality");

        this.$imageMaxWidthHeight.on('change', () =>
            this.updateOption('imageMaxWidthHeight', this.$imageMaxWidthHeight.val()));

        this.$imageJpegQuality.on('change', () =>
            this.updateOption('imageJpegQuality', this.$imageJpegQuality.val().trim() || "75"));

        this.$downloadImagesAutomatically = this.$widget.find(".download-images-automatically");

        this.$downloadImagesAutomatically.on("change", () =>
            this.updateCheckboxOption('downloadImagesAutomatically', this.$downloadImagesAutomatically));

        this.$enableImageCompression = this.$widget.find(".image-compresion-enabled");
        this.$imageCompressionWrapper = this.$widget.find(".image-compression-enabled-wraper");

        this.$enableImageCompression.on("change", () => {
            this.updateCheckboxOption('compressImages', this.$enableImageCompression);
            this.setImageCompression();
        });
    }

    optionsLoaded(options) {
        this.$imageMaxWidthHeight.val(options.imageMaxWidthHeight);
        this.$imageJpegQuality.val(options.imageJpegQuality);

        this.setCheckboxState(this.$downloadImagesAutomatically, options.downloadImagesAutomatically);
        this.setCheckboxState(this.$enableImageCompression, options.compressImages);

        this.setImageCompression();
    }

    setImageCompression() {
        if (this.$enableImageCompression.prop("checked")) {
            this.$imageCompressionWrapper.removeClass("disabled-field");
        } else {
            this.$imageCompressionWrapper.addClass("disabled-field");
        }
    }
}
