import { EntityChange } from "../../../services/entity_changes_interface.js";

interface BranchRow {
    branchId: string;
    componentId: string;
}

interface AttributeRow {
    attributeId: string;
    componentId: string;
}

interface RevisionRow {
    revisionId: string;
    noteId?: string;
    componentId?: string | null;
}

interface ContentNoteIdToComponentIdRow {
    noteId: string;
    componentId: string;
}

interface AttachmentRow {}

interface ContentNoteIdToComponentIdRow {
    noteId: string;
    componentId: string;
}

export default class LoadResults {
    private entities: Record<string, Record<string, unknown>>;
    private noteIdToComponentId: Record<string, string[]>;
    private componentIdToNoteIds: Record<string, string[]>;
    private branchRows: BranchRow[];
    private attributeRows: AttributeRow[];
    private revisionRows: RevisionRow[];
    private noteReorderings: string[];
    private contentNoteIdToComponentId: ContentNoteIdToComponentIdRow[];
    private optionNames: string[];
    private attachmentRows: AttachmentRow[];

    constructor(entityChanges: EntityChange[]) {
        this.entities = {};

        for (const {entityId, entityName, entity} of entityChanges) {
            if (entity) {
                this.entities[entityName] = this.entities[entityName] || [];
                this.entities[entityName][entityId] = entity;
            }
        }

        this.noteIdToComponentId = {};
        this.componentIdToNoteIds = {};

        this.branchRows = [];

        this.attributeRows = [];

        this.noteReorderings = [];

        this.revisionRows = [];

        this.contentNoteIdToComponentId = [];

        this.optionNames = [];

        this.attachmentRows = [];
    }

    getEntityRow(entityName: string, entityId: string) {
        return this.entities[entityName]?.[entityId];
    }

    addNote(noteId: string, componentId?: string | null) {
        this.noteIdToComponentId[noteId] = this.noteIdToComponentId[noteId] || [];

        if (componentId) {
            if (!this.noteIdToComponentId[noteId].includes(componentId)) {
                this.noteIdToComponentId[noteId].push(componentId);
            }
    
            this.componentIdToNoteIds[componentId] = this.componentIdToNoteIds[componentId] || [];
    
            if (!this.componentIdToNoteIds[componentId]) {
                this.componentIdToNoteIds[componentId].push(noteId);
            }
        }
    }

    addBranch(branchId: string, componentId: string) {
        this.branchRows.push({branchId, componentId});
    }

    getBranchRows() {
        return this.branchRows
            .map(row => this.getEntityRow("branches", row.branchId))
            .filter(branch => !!branch);
    }

    addNoteReordering(parentNoteId: string, componentId: string) {
        this.noteReorderings.push(parentNoteId);
    }

    getNoteReorderings() {
        return this.noteReorderings;
    }

    addAttribute(attributeId: string, componentId: string) {
        this.attributeRows.push({attributeId, componentId});
    }

    getAttributeRows(componentId = 'none') {
        return this.attributeRows
            .filter(row => row.componentId !== componentId)
            .map(row => this.getEntityRow("attributes", row.attributeId))
            .filter(attr => !!attr);
    }

    addRevision(revisionId: string, noteId?: string, componentId?: string | null) {
        this.revisionRows.push({revisionId, noteId, componentId});
    }

    hasRevisionForNote(noteId: string) {
        return !!this.revisionRows.find(row => row.noteId === noteId);
    }

    getNoteIds() {
        return Object.keys(this.noteIdToComponentId);
    }

    isNoteReloaded(noteId: string, componentId = null) {
        if (!noteId) {
            return false;
        }

        const componentIds = this.noteIdToComponentId[noteId];
        return componentIds && componentIds.find(sId => sId !== componentId) !== undefined;
    }

    addNoteContent(noteId: string, componentId: string) {
        this.contentNoteIdToComponentId.push({noteId, componentId});
    }

    isNoteContentReloaded(noteId: string, componentId: string) {
        if (!noteId) {
            return false;
        }

        return this.contentNoteIdToComponentId.find(l => l.noteId === noteId && l.componentId !== componentId);
    }

    addOption(name: string) {
        this.optionNames.push(name);
    }

    isOptionReloaded(name: string) {
        return this.optionNames.includes(name);
    }

    getOptionNames() {
        return this.optionNames;
    }

    addAttachmentRow(attachment: AttachmentRow) {
        this.attachmentRows.push(attachment);
    }

    getAttachmentRows() {
        return this.attachmentRows;
    }

    /**
     * @returns {boolean} true if there are changes which could affect the attributes (including inherited ones)
     *          notably changes in note itself should not have any effect on attributes
     */
    hasAttributeRelatedChanges() {
        return this.branchRows.length > 0
            || this.attributeRows.length > 0;
    }

    isEmpty() {
        return Object.keys(this.noteIdToComponentId).length === 0
            && this.branchRows.length === 0
            && this.attributeRows.length === 0
            && this.noteReorderings.length === 0
            && this.revisionRows.length === 0
            && this.contentNoteIdToComponentId.length === 0
            && this.optionNames.length === 0
            && this.attachmentRows.length === 0;
    }

    isEmptyForTree() {
        return Object.keys(this.noteIdToComponentId).length === 0
            && this.branchRows.length === 0
            && this.attributeRows.length === 0
            && this.noteReorderings.length === 0;
    }
}
