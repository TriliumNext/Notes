import { EntityRowNames } from "./services/load_results.js";

// TODO: Deduplicate with src/services/entity_changes_interface.ts
export interface EntityChange {
    id?: number | null;
    noteId?: string;
    entityName: EntityRowNames;
    entityId: string;
    entity?: any;
    positions?: Record<string, number>;
    hash: string;
    utcDateChanged?: string;
    utcDateModified?: string;
    utcDateCreated?: string;
    isSynced: boolean | 1 | 0;
    isErased: boolean | 1 | 0;
    componentId?: string | null;
    changeId?: string | null;
    instanceId?: string | null;
}
