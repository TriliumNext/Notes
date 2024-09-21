import { AttributeType } from "../../becca/entities/rows.js";

interface AttributeMeta {
    noteId?: string;
    type: AttributeType;
    name: string;
    value: string;
    isInheritable?: boolean;
    position?: number;
}

export default AttributeMeta;
