import type { AttributeType } from "../../becca/entities/rows.js";

export default interface AttributeMeta {
    noteId?: string;
    type: AttributeType;
    name: string;
    value: string;
    isInheritable?: boolean;
    position?: number;
}
