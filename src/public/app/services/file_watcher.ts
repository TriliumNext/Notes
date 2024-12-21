import ws from "./ws.js";
import appContext from "../components/app_context.js";

// TODO: Deduplicate
interface Message {
    type: string;
    entityType: string;
    entityId: string;
    lastModifiedMs: number;
    filePath: string;
}

const fileModificationStatus: Record<string, Record<string, Message>> = {
    notes: {},
    attachments: {}
};

function checkType(type: string) {
    if (type !== 'notes' && type !== 'attachments') {
        throw new Error(`Unrecognized type '${type}', should be 'notes' or 'attachments'`);
    }
}

function getFileModificationStatus(entityType: string, entityId: string) {
    checkType(entityType);

    return fileModificationStatus[entityType][entityId];
}

function fileModificationUploaded(entityType: string, entityId: string) {
    checkType(entityType);

    delete fileModificationStatus[entityType][entityId];
}

function ignoreModification(entityType: string, entityId: string) {
    checkType(entityType);

    delete fileModificationStatus[entityType][entityId];
}

ws.subscribeToMessages(async (message: Message) => {
    if (message.type !== 'openedFileUpdated') {
        return;
    }

    checkType(message.entityType);

    fileModificationStatus[message.entityType][message.entityId] = message;

    appContext.triggerEvent('openedFileUpdated', {
        entityType: message.entityType,
        entityId: message.entityId,
        lastModifiedMs: message.lastModifiedMs,
        filePath: message.filePath
    });
});

export default {
    getFileModificationStatus,
    fileModificationUploaded,
    ignoreModification
}
