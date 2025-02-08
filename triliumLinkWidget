async function OpenLocalPath(event) {
    // Check if the event was a Ctrl+double click.
    if (event.ctrlKey) {
        var path = event.target.innerText;
        console.log(`>> ctrl + double_click get line content:\n${path}`)
        
        // Check if the text content contains a file path. ------
        if (/[\/\w\-\.]+\/*[\/\w\-\.]*$/.test(path)) {
            var path = path.match(/[\/\w\-\.]+\/*[\/\w\-\.]*$/)[0]
            console.log(`>> Open local path: ${path}`)
            
            // Check if the path exists, then run the xdg-open command to open the file.
            const fs = require('fs');
            const { exec } = require('child_process');
            
            // Verify the file exists
            fs.exists(path, function (exists) {
                if (exists) {
                    exec(`xdg-open "${path}"`, (err, stdout, stderr) => {
                        if (err) {
                            console.error('Error opening file:', stderr);
                        } else {
                            console.log('File opened:', stdout);
                        }
                    });
                } else {
                    console.log('File not found:', path);
                }
            });
        }
    }
}

const TEMPLATE = `
    <div style="padding: 10px; border-top: 1px solid var(--main-border-color); contain: none;">
    <script>
    ${OpenLocalPath.toString()}
    document.addEventListener('dblclick', OpenLocalPath);
    </script>
    </div>`;

class PathLinkerWidget extends api.NoteContextAwareWidget {
    constructor(...args) {
        super(...args);
        this.balloonEditorCreate = null;
    }
    
    get position() { 
        // higher value means position towards the bottom/right
        return 100; 
    } 

    get parentWidget() { return 'center-pane'; }

    doRender() {
        this.$widget = $(TEMPLATE);
        this.$widget.hide();
        
        // store API in document to access it from callback
        document.PathLinkerApi = api;
        return this.$widget;
    }
}

let widget = new PathLinkerWidget();
console.log(">> Loaded PathLinkerWidget");
module.exports = widget;
