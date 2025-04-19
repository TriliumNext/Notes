import becca from "../../src/becca/becca";
import becca_loader from "../../src/becca/becca_loader";
import cls from "../../src/services/cls";
import log from "../../src/services/log";
import sql from "../../src/services/sql";

export default () => {
    cls.init(() => {
        // emergency disabling of image compression since it appears to make problems in migration to 0.61
        sql.execute(/*sql*/`UPDATE options SET value = 'false' WHERE name = 'compressImages'`);

        becca_loader.load();

        for (const note of Object.values(becca.notes)) {
            try {
                const attachment = note.convertToParentAttachment({ autoConversion: true });

                if (attachment) {
                    log.info(`Auto-converted note '${note.noteId}' into attachment '${attachment.attachmentId}'.`);
                }
            } catch (e) {
                log.error(`Cannot convert note '${note.noteId}' to attachment: ${e.message} ${e.stack}`);
            }
        }
    });
};
