/**
 * Attribute Manager Tool
 *
 * This tool allows the LLM to add, remove, or modify note attributes in Trilium.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';
import becca from '../../../becca/becca.js';
import attributes from '../../attributes.js';

/**
 * Definition of the attribute manager tool
 */
export const attributeManagerToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'manage_attributes',
        description: 'Add, remove, or modify attributes (labels/relations) on a note',
        parameters: {
            type: 'object',
            properties: {
                noteId: {
                    type: 'string',
                    description: 'ID of the note to manage attributes for'
                },
                action: {
                    type: 'string',
                    description: 'Action to perform on the attribute',
                    enum: ['add', 'remove', 'update', 'list']
                },
                attributeName: {
                    type: 'string',
                    description: 'Name of the attribute (e.g., "#tag" for a label, or "relation" for a relation)'
                },
                attributeValue: {
                    type: 'string',
                    description: 'Value of the attribute (for add/update actions). Not needed for label-type attributes.'
                }
            },
            required: ['noteId', 'action']
        }
    }
};

/**
 * Attribute manager tool implementation
 */
export class AttributeManagerTool implements ToolHandler {
    public definition: Tool = attributeManagerToolDefinition;

    /**
     * Execute the attribute manager tool
     */
    public async execute(args: { noteId: string, action: string, attributeName?: string, attributeValue?: string }): Promise<string | object> {
        try {
            const { noteId, action, attributeName, attributeValue } = args;

            log.info(`Executing manage_attributes tool - NoteID: "${noteId}", Action: ${action}, AttributeName: ${attributeName || 'not specified'}`);

            // Get the note from becca
            const note = becca.notes[noteId];

            if (!note) {
                log.info(`Note with ID ${noteId} not found - returning error`);
                return `Error: Note with ID ${noteId} not found`;
            }

            log.info(`Found note: "${note.title}" (Type: ${note.type})`);

            // List all existing attributes
            if (action === 'list') {
                const noteAttributes = note.getOwnedAttributes();
                log.info(`Listing ${noteAttributes.length} attributes for note "${note.title}"`);

                const formattedAttributes = noteAttributes.map(attr => ({
                    name: attr.name,
                    value: attr.value,
                    type: attr.type
                }));

                return {
                    success: true,
                    noteId: note.noteId,
                    title: note.title,
                    attributeCount: noteAttributes.length,
                    attributes: formattedAttributes
                };
            }

            // For other actions, attribute name is required
            if (!attributeName) {
                return 'Error: attributeName is required for add, remove, and update actions';
            }

            // Perform the requested action
            if (action === 'add') {
                // Add a new attribute
                try {
                    const startTime = Date.now();

                    // For label-type attributes (starting with #), no value is needed
                    const isLabel = attributeName.startsWith('#');
                    const value = isLabel ? '' : (attributeValue || '');

                    // Check if attribute already exists
                    const existingAttrs = note.getOwnedAttributes()
                        .filter(attr => attr.name === attributeName && attr.value === value);

                    if (existingAttrs.length > 0) {
                        log.info(`Attribute ${attributeName}=${value} already exists on note "${note.title}"`);
                        return {
                            success: false,
                            message: `Attribute ${attributeName}=${value || ''} already exists on note "${note.title}"`
                        };
                    }

                    // Create the attribute
                    await attributes.createLabel(noteId, attributeName, value);
                    const duration = Date.now() - startTime;

                    log.info(`Added attribute ${attributeName}=${value || ''} in ${duration}ms`);
                    return {
                        success: true,
                        noteId: note.noteId,
                        title: note.title,
                        action: 'add',
                        attributeName: attributeName,
                        attributeValue: value,
                        message: `Added attribute ${attributeName}=${value || ''} to note "${note.title}"`
                    };
                } catch (error: any) {
                    log.error(`Error adding attribute: ${error.message || String(error)}`);
                    return `Error: ${error.message || String(error)}`;
                }
            } else if (action === 'remove') {
                // Remove an attribute
                try {
                    const startTime = Date.now();

                    // Find the attribute to remove
                    const attributesToRemove = note.getOwnedAttributes()
                        .filter(attr => attr.name === attributeName &&
                                        (attributeValue === undefined || attr.value === attributeValue));

                    if (attributesToRemove.length === 0) {
                        log.info(`Attribute ${attributeName} not found on note "${note.title}"`);
                        return {
                            success: false,
                            message: `Attribute ${attributeName} not found on note "${note.title}"`
                        };
                    }

                    // Remove all matching attributes
                    for (const attr of attributesToRemove) {
                        // Delete attribute by recreating it with isDeleted flag
                        const attrToDelete = {
                            attributeId: attr.attributeId,
                            noteId: attr.noteId,
                            type: attr.type,
                            name: attr.name,
                            value: attr.value,
                            isDeleted: true,
                            position: attr.position,
                            utcDateModified: new Date().toISOString()
                        };
                        await attributes.createAttribute(attrToDelete);
                    }

                    const duration = Date.now() - startTime;
                    log.info(`Removed ${attributesToRemove.length} attribute(s) in ${duration}ms`);

                    return {
                        success: true,
                        noteId: note.noteId,
                        title: note.title,
                        action: 'remove',
                        attributeName: attributeName,
                        attributesRemoved: attributesToRemove.length,
                        message: `Removed ${attributesToRemove.length} attribute(s) from note "${note.title}"`
                    };
                } catch (error: any) {
                    log.error(`Error removing attribute: ${error.message || String(error)}`);
                    return `Error: ${error.message || String(error)}`;
                }
            } else if (action === 'update') {
                // Update an attribute
                try {
                    const startTime = Date.now();

                    if (attributeValue === undefined) {
                        return 'Error: attributeValue is required for update action';
                    }

                    // Find the attribute to update
                    const attributesToUpdate = note.getOwnedAttributes()
                        .filter(attr => attr.name === attributeName);

                    if (attributesToUpdate.length === 0) {
                        log.info(`Attribute ${attributeName} not found on note "${note.title}"`);
                        return {
                            success: false,
                            message: `Attribute ${attributeName} not found on note "${note.title}"`
                        };
                    }

                    // Update all matching attributes
                    for (const attr of attributesToUpdate) {
                        // Update by recreating with the same ID but new value
                        const attrToUpdate = {
                            attributeId: attr.attributeId,
                            noteId: attr.noteId,
                            type: attr.type,
                            name: attr.name,
                            value: attributeValue,
                            isDeleted: false,
                            position: attr.position,
                            utcDateModified: new Date().toISOString()
                        };
                        await attributes.createAttribute(attrToUpdate);
                    }

                    const duration = Date.now() - startTime;
                    log.info(`Updated ${attributesToUpdate.length} attribute(s) in ${duration}ms`);

                    return {
                        success: true,
                        noteId: note.noteId,
                        title: note.title,
                        action: 'update',
                        attributeName: attributeName,
                        attributeValue: attributeValue,
                        attributesUpdated: attributesToUpdate.length,
                        message: `Updated ${attributesToUpdate.length} attribute(s) on note "${note.title}"`
                    };
                } catch (error: any) {
                    log.error(`Error updating attribute: ${error.message || String(error)}`);
                    return `Error: ${error.message || String(error)}`;
                }
            } else {
                return `Error: Unsupported action "${action}". Supported actions are: add, remove, update, list`;
            }
        } catch (error: any) {
            log.error(`Error executing manage_attributes tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }
}
