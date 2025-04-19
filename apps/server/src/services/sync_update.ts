import sql from "./sql.js";
import log from "./log.js";
import entityChangesService from "./entity_changes.js";
import eventService from "./events.js";
import entityConstructor from "../becca/entity_constructor.js";
import ws from "./ws.js";
import type { EntityChange, EntityChangeRecord, EntityRow } from "./entity_changes_interface.js";

interface UpdateContext {
    alreadyErased: number;
    erased: number;
    updated: Record<string, string[]>;
}

function updateEntities(entityChanges: EntityChangeRecord[], instanceId: string) {
    if (entityChanges.length === 0) {
        return;
    }

    let atLeastOnePullApplied = false;
    const updateContext = {
        updated: {},
        alreadyUpdated: 0,
        erased: 0,
        alreadyErased: 0
    };

    for (const { entityChange, entity } of entityChanges) {
        const changeAppliedAlready = entityChange.changeId && !!sql.getValue("SELECT 1 FROM entity_changes WHERE changeId = ?", [entityChange.changeId]);

        if (changeAppliedAlready) {
            updateContext.alreadyUpdated++;

            continue;
        }

        if (!atLeastOnePullApplied) {
            // avoid spamming and send only for first
            ws.syncPullInProgress();

            atLeastOnePullApplied = true;
        }

        updateEntity(entityChange, entity, instanceId, updateContext);
    }

    logUpdateContext(updateContext);
}

function updateEntity(remoteEC: EntityChange, remoteEntityRow: EntityRow | undefined, instanceId: string, updateContext: UpdateContext) {
    if (!remoteEntityRow && remoteEC.entityName === "options") {
        return; // can be undefined for options with isSynced=false
    }

    const updated = remoteEC.entityName === "note_reordering"
        ? updateNoteReordering(remoteEC, remoteEntityRow, instanceId)
        : (remoteEC.entityName === "note_embeddings"
            ? updateNoteEmbedding(remoteEC, remoteEntityRow, instanceId, updateContext)
            : updateNormalEntity(remoteEC, remoteEntityRow, instanceId, updateContext));

    if (updated) {
        if (remoteEntityRow?.isDeleted) {
            eventService.emit(eventService.ENTITY_DELETE_SYNCED, {
                entityName: remoteEC.entityName,
                entityId: remoteEC.entityId
            });
        } else if (!remoteEC.isErased) {
            eventService.emit(eventService.ENTITY_CHANGE_SYNCED, {
                entityName: remoteEC.entityName,
                entityRow: remoteEntityRow
            });
        }
    }
}

function updateNormalEntity(remoteEC: EntityChange, remoteEntityRow: EntityRow | undefined, instanceId: string, updateContext: UpdateContext) {
    const localEC = sql.getRow<EntityChange | undefined>(/*sql*/`SELECT * FROM entity_changes WHERE entityName = ? AND entityId = ?`, [remoteEC.entityName, remoteEC.entityId]);
    const localECIsOlderOrSameAsRemote = localEC && localEC.utcDateChanged && remoteEC.utcDateChanged && localEC.utcDateChanged <= remoteEC.utcDateChanged;

    if (!localEC || localECIsOlderOrSameAsRemote) {
        if (remoteEC.isErased) {
            if (localEC?.isErased) {
                eraseEntity(remoteEC); // make sure it's erased anyway
                updateContext.alreadyErased++;
            } else {
                eraseEntity(remoteEC);
                updateContext.erased++;
            }
        } else {
            if (!remoteEntityRow) {
                throw new Error(`Empty entity row for: ${JSON.stringify(remoteEC)}`);
            }

            preProcessContent(remoteEC, remoteEntityRow);

            sql.replace(remoteEC.entityName, remoteEntityRow);

            updateContext.updated[remoteEC.entityName] = updateContext.updated[remoteEC.entityName] || [];
            updateContext.updated[remoteEC.entityName].push(remoteEC.entityId);
        }

        if (!localEC || localECIsOlderOrSameAsRemote || localEC.hash !== remoteEC.hash || localEC.isErased !== remoteEC.isErased) {
            entityChangesService.putEntityChangeWithInstanceId(remoteEC, instanceId);
        }

        return true;
    } else if ((localEC.hash !== remoteEC.hash || localEC.isErased !== remoteEC.isErased) && !localECIsOlderOrSameAsRemote) {
        // the change on our side is newer than on the other side, so the other side should update
        entityChangesService.putEntityChangeForOtherInstances(localEC);

        return false;
    }

    return false;
}

function preProcessContent(remoteEC: EntityChange, remoteEntityRow: EntityRow) {
    if (remoteEC.entityName === "blobs" && remoteEntityRow.content !== null) {
        // we always use a Buffer object which is different from normal saving - there we use a simple string type for
        // "string notes". The problem is that in general, it's not possible to detect whether a blob content
        // is string note or note (syncs can arrive out of order)
        if (typeof remoteEntityRow.content === "string") {
            remoteEntityRow.content = Buffer.from(remoteEntityRow.content, "base64");

            if (remoteEntityRow.content.byteLength === 0) {
                // there seems to be a bug which causes empty buffer to be stored as NULL which is then picked up as inconsistency
                // (possibly not a problem anymore with the newer better-sqlite3)
                remoteEntityRow.content = "";
            }
        }
    }
}

function updateNoteReordering(remoteEC: EntityChange, remoteEntityRow: EntityRow | undefined, instanceId: string) {
    if (!remoteEntityRow) {
        throw new Error(`Empty note_reordering body for: ${JSON.stringify(remoteEC)}`);
    }

    for (const key in remoteEntityRow) {
        sql.execute("UPDATE branches SET notePosition = ? WHERE branchId = ?", [remoteEntityRow[key as keyof EntityRow], key]);
    }

    entityChangesService.putEntityChangeWithInstanceId(remoteEC, instanceId);

    return true;
}

function updateNoteEmbedding(remoteEC: EntityChange, remoteEntityRow: EntityRow | undefined, instanceId: string, updateContext: UpdateContext) {
    if (remoteEC.isErased) {
        eraseEntity(remoteEC);
        updateContext.erased++;
        return true;
    }

    if (!remoteEntityRow) {
        log.error(`Entity ${remoteEC.entityName} ${remoteEC.entityId} not found in sync update.`);
        return false;
    }

    interface NoteEmbeddingRow {
        embedId: string;
        noteId: string;
        providerId: string;
        modelId: string;
        dimension: number;
        embedding: Buffer;
        version: number;
        dateCreated: string;
        utcDateCreated: string;
        dateModified: string;
        utcDateModified: string;
    }

    // Cast remoteEntityRow to include required embedding properties
    const typedRemoteEntityRow = remoteEntityRow as unknown as NoteEmbeddingRow;

    // Convert embedding from base64 string to Buffer if needed
    if (typedRemoteEntityRow.embedding && typeof typedRemoteEntityRow.embedding === "string") {
        typedRemoteEntityRow.embedding = Buffer.from(typedRemoteEntityRow.embedding, "base64");
    }

    const localEntityRow = sql.getRow<NoteEmbeddingRow>(`SELECT * FROM note_embeddings WHERE embedId = ?`, [remoteEC.entityId]);

    if (localEntityRow) {
        // We already have this embedding, check if we need to update it
        if (localEntityRow.utcDateModified >= typedRemoteEntityRow.utcDateModified) {
            // Local is newer or same, no need to update
            entityChangesService.putEntityChangeWithInstanceId(remoteEC, instanceId);
            return true;
        } else {
            // Remote is newer, update local
            sql.replace("note_embeddings", remoteEntityRow);

            if (!updateContext.updated[remoteEC.entityName]) {
                updateContext.updated[remoteEC.entityName] = [];
            }
            updateContext.updated[remoteEC.entityName].push(remoteEC.entityId);

            entityChangesService.putEntityChangeWithInstanceId(remoteEC, instanceId);
            return true;
        }
    } else {
        // We don't have this embedding, insert it
        sql.replace("note_embeddings", remoteEntityRow);

        if (!updateContext.updated[remoteEC.entityName]) {
            updateContext.updated[remoteEC.entityName] = [];
        }
        updateContext.updated[remoteEC.entityName].push(remoteEC.entityId);

        entityChangesService.putEntityChangeWithInstanceId(remoteEC, instanceId);
        return true;
    }
}

function eraseEntity(entityChange: EntityChange) {
    const { entityName, entityId } = entityChange;

    const entityNames = ["notes", "branches", "attributes", "revisions", "attachments", "blobs", "note_embeddings"];

    if (!entityNames.includes(entityName)) {
        log.error(`Cannot erase ${entityName} '${entityId}'.`);
        return;
    }

    const primaryKeyName = entityConstructor.getEntityFromEntityName(entityName).primaryKeyName;

    sql.execute(/*sql*/`DELETE FROM ${entityName} WHERE ${primaryKeyName} = ?`, [entityId]);
}

function logUpdateContext(updateContext: UpdateContext) {
    const message = JSON.stringify(updateContext).replaceAll('"', "").replaceAll(":", ": ").replaceAll(",", ", ");

    log.info(message.substr(1, message.length - 2));
}

export default {
    updateEntities
};
