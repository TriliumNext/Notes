import server from "../../services/server.js";
import utils from "../../services/utils.js";

const TPL = `
<div>
    <h4>Appearance settings</h4>
    
    <div class="form-group">
        <label>Theme</label>
        <select class="form-control" name="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </div>

    <div class="form-group">
        <label>Font size</label>
        <div class="input-group">
            <input type="number" class="form-control" name="font-size" min="50" max="200">
            <div class="input-group-append">
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <div class="form-group">
        <label>Zoom factor</label>
        <div class="input-group">
            <input type="number" class="form-control" name="zoom-factor" min="0.3" max="2.0" step="0.1">
            <div class="input-group-append">
                <span class="input-group-text">×</span>
            </div>
        </div>
    </div>
</div>`;

export default class AppearanceOptions {
    constructor() {
        this.$widget = $(TPL);
    }

    async optionsLoaded(options) {
        this.$widget.find('select[name=theme]').val(options.theme);
        this.$widget.find('input[name=font-size]').val(options.fontSize);
        this.$widget.find('input[name=zoom-factor]').val(options.zoomFactor);
    }

    async save(options) {
        options.theme = this.$widget.find('select[name=theme]').val();
        options.fontSize = this.$widget.find('input[name=font-size]').val();
        options.zoomFactor = this.$widget.find('input[name=zoom-factor]').val();
    }
}
