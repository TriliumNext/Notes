import type { AttributeType } from "@triliumnext/commons";

export default interface AttributeMeta {
    noteId?: string;
    type: AttributeType;
    name: string;
    value: string;
    isInheritable?: boolean;
    position?: number;
}
