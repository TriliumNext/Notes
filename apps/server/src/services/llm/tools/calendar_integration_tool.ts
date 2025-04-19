/**
 * Calendar Integration Tool
 *
 * This tool allows the LLM to find date-related notes or create date-based entries.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';
import becca from '../../../becca/becca.js';
import notes from '../../notes.js';
import attributes from '../../attributes.js';
import dateNotes from '../../date_notes.js';

/**
 * Definition of the calendar integration tool
 */
export const calendarIntegrationToolDefinition: Tool = {
    type: 'function',
    function: {
        name: 'calendar_integration',
        description: 'Find date-related notes or create date-based entries',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Action to perform',
                    enum: ['find_date_notes', 'create_date_note', 'find_notes_with_date_range', 'get_daily_note']
                },
                date: {
                    type: 'string',
                    description: 'Date in ISO format (YYYY-MM-DD) for the note'
                },
                dateStart: {
                    type: 'string',
                    description: 'Start date in ISO format (YYYY-MM-DD) for date range queries'
                },
                dateEnd: {
                    type: 'string',
                    description: 'End date in ISO format (YYYY-MM-DD) for date range queries'
                },
                title: {
                    type: 'string',
                    description: 'Title for creating a new date-related note'
                },
                content: {
                    type: 'string',
                    description: 'Content for creating a new date-related note'
                },
                parentNoteId: {
                    type: 'string',
                    description: 'Optional parent note ID for the new date note. If not specified, will use default calendar container.'
                }
            },
            required: ['action']
        }
    }
};

/**
 * Calendar integration tool implementation
 */
export class CalendarIntegrationTool implements ToolHandler {
    public definition: Tool = calendarIntegrationToolDefinition;

    /**
     * Execute the calendar integration tool
     */
    public async execute(args: {
        action: string,
        date?: string,
        dateStart?: string,
        dateEnd?: string,
        title?: string,
        content?: string,
        parentNoteId?: string
    }): Promise<string | object> {
        try {
            const { action, date, dateStart, dateEnd, title, content, parentNoteId } = args;

            log.info(`Executing calendar_integration tool - Action: ${action}, Date: ${date || 'not specified'}`);

            // Handle different actions
            if (action === 'find_date_notes') {
                return await this.findDateNotes(date);
            } else if (action === 'create_date_note') {
                return await this.createDateNote(date, title, content, parentNoteId);
            } else if (action === 'find_notes_with_date_range') {
                return await this.findNotesWithDateRange(dateStart, dateEnd);
            } else if (action === 'get_daily_note') {
                return await this.getDailyNote(date);
            } else {
                return `Error: Unsupported action "${action}". Supported actions are: find_date_notes, create_date_note, find_notes_with_date_range, get_daily_note`;
            }
        } catch (error: any) {
            log.error(`Error executing calendar_integration tool: ${error.message || String(error)}`);
            return `Error: ${error.message || String(error)}`;
        }
    }

    /**
     * Find notes related to a specific date
     */
    private async findDateNotes(date?: string): Promise<object> {
        if (!date) {
            // If no date is provided, use today's date
            const today = new Date();
            date = today.toISOString().split('T')[0];
            log.info(`No date specified, using today's date: ${date}`);
        }

        try {
            // Validate date format
            if (!this.isValidDate(date)) {
                return {
                    success: false,
                    message: `Invalid date format. Please use YYYY-MM-DD format.`
                };
            }

            log.info(`Finding notes related to date: ${date}`);

            // Get notes with dateNote attribute matching this date
            const notesWithDateAttribute = this.getNotesWithDateAttribute(date);
            log.info(`Found ${notesWithDateAttribute.length} notes with date attribute for ${date}`);

            // Get year, month, day notes if they exist
            const yearMonthDayNotes = await this.getYearMonthDayNotes(date);

            // Format results
            return {
                success: true,
                date: date,
                yearNote: yearMonthDayNotes.yearNote ? {
                    noteId: yearMonthDayNotes.yearNote.noteId,
                    title: yearMonthDayNotes.yearNote.title
                } : null,
                monthNote: yearMonthDayNotes.monthNote ? {
                    noteId: yearMonthDayNotes.monthNote.noteId,
                    title: yearMonthDayNotes.monthNote.title
                } : null,
                dayNote: yearMonthDayNotes.dayNote ? {
                    noteId: yearMonthDayNotes.dayNote.noteId,
                    title: yearMonthDayNotes.dayNote.title
                } : null,
                relatedNotes: notesWithDateAttribute.map(note => ({
                    noteId: note.noteId,
                    title: note.title,
                    type: note.type
                })),
                message: `Found ${notesWithDateAttribute.length} notes related to date ${date}`
            };
        } catch (error: any) {
            log.error(`Error finding date notes: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Create a new note associated with a date
     */
    private async createDateNote(date?: string, title?: string, content?: string, parentNoteId?: string): Promise<object> {
        if (!date) {
            // If no date is provided, use today's date
            const today = new Date();
            date = today.toISOString().split('T')[0];
            log.info(`No date specified, using today's date: ${date}`);
        }

        // Validate date format
        if (!this.isValidDate(date)) {
            return {
                success: false,
                message: `Invalid date format. Please use YYYY-MM-DD format.`
            };
        }

        if (!title) {
            title = `Note for ${date}`;
        }

        if (!content) {
            content = `<p>Date note created for ${date}</p>`;
        }

        try {
            log.info(`Creating new date note for ${date} with title "${title}"`);

            // If no parent is specified, try to find appropriate date container
            if (!parentNoteId) {
                // Get or create day note to use as parent
                const dateComponents = this.parseDateString(date);
                if (!dateComponents) {
                    return {
                        success: false,
                        message: `Invalid date format. Please use YYYY-MM-DD format.`
                    };
                }

                // Use the date string directly with getDayNote
                const dayNote = await dateNotes.getDayNote(date);

                if (dayNote) {
                    parentNoteId = dayNote.noteId;
                    log.info(`Using day note ${dayNote.title} (${parentNoteId}) as parent`);
                } else {
                    // Use root if day note couldn't be found/created
                    parentNoteId = 'root';
                    log.info(`Could not find/create day note, using root as parent`);
                }
            }

            // Validate parent note exists
            const parent = becca.notes[parentNoteId];
            if (!parent) {
                return {
                    success: false,
                    message: `Parent note with ID ${parentNoteId} not found. Please specify a valid parent note ID.`
                };
            }

            // Create the new note
            const createStartTime = Date.now();
            const result = notes.createNewNote({
                parentNoteId: parent.noteId,
                title: title,
                content: content,
                type: 'text' as const,
                mime: 'text/html'
            });
            const noteId = result.note.noteId;
            const createDuration = Date.now() - createStartTime;

            if (!noteId) {
                return {
                    success: false,
                    message: `Failed to create date note. An unknown error occurred.`
                };
            }

            log.info(`Created new note with ID ${noteId} in ${createDuration}ms`);

            // Add dateNote attribute with the specified date
            const attrStartTime = Date.now();
            await attributes.createLabel(noteId, 'dateNote', date);
            const attrDuration = Date.now() - attrStartTime;

            log.info(`Added dateNote=${date} attribute in ${attrDuration}ms`);

            // Return the new note information
            return {
                success: true,
                noteId: noteId,
                date: date,
                title: title,
                message: `Created new date note "${title}" for ${date}`
            };
        } catch (error: any) {
            log.error(`Error creating date note: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Find notes with date attributes in a specified range
     */
    private async findNotesWithDateRange(dateStart?: string, dateEnd?: string): Promise<object> {
        if (!dateStart || !dateEnd) {
            return {
                success: false,
                message: `Both dateStart and dateEnd are required for find_notes_with_date_range action.`
            };
        }

        // Validate date formats
        if (!this.isValidDate(dateStart) || !this.isValidDate(dateEnd)) {
            return {
                success: false,
                message: `Invalid date format. Please use YYYY-MM-DD format.`
            };
        }

        try {
            log.info(`Finding notes with date attributes in range ${dateStart} to ${dateEnd}`);

            // Get all notes with dateNote attribute
            const allNotes = this.getAllNotesWithDateAttribute();

            // Filter by date range
            const startDate = new Date(dateStart);
            const endDate = new Date(dateEnd);

            const filteredNotes = allNotes.filter(note => {
                const dateAttr = note.getOwnedAttributes()
                    .find((attr: any) => attr.name === 'dateNote');

                if (dateAttr && dateAttr.value) {
                    const noteDate = new Date(dateAttr.value);
                    return noteDate >= startDate && noteDate <= endDate;
                }

                return false;
            });

            log.info(`Found ${filteredNotes.length} notes in date range`);

            // Sort notes by date
            filteredNotes.sort((a, b) => {
                const aDateAttr = a.getOwnedAttributes().find((attr: any) => attr.name === 'dateNote');
                const bDateAttr = b.getOwnedAttributes().find((attr: any) => attr.name === 'dateNote');

                if (aDateAttr && bDateAttr) {
                    const aDate = new Date(aDateAttr.value);
                    const bDate = new Date(bDateAttr.value);
                    return aDate.getTime() - bDate.getTime();
                }

                return 0;
            });

            // Format results
            return {
                success: true,
                dateStart: dateStart,
                dateEnd: dateEnd,
                noteCount: filteredNotes.length,
                notes: filteredNotes.map(note => {
                    const dateAttr = note.getOwnedAttributes().find((attr: any) => attr.name === 'dateNote');
                    return {
                        noteId: note.noteId,
                        title: note.title,
                        type: note.type,
                        date: dateAttr ? dateAttr.value : null
                    };
                }),
                message: `Found ${filteredNotes.length} notes in date range ${dateStart} to ${dateEnd}`
            };
        } catch (error: any) {
            log.error(`Error finding notes in date range: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Get or create a daily note for a specific date
     */
    private async getDailyNote(date?: string): Promise<object> {
        if (!date) {
            // If no date is provided, use today's date
            const today = new Date();
            date = today.toISOString().split('T')[0];
            log.info(`No date specified, using today's date: ${date}`);
        }

        // Validate date format
        if (!this.isValidDate(date)) {
            return {
                success: false,
                message: `Invalid date format. Please use YYYY-MM-DD format.`
            };
        }

        try {
            log.info(`Getting daily note for ${date}`);

            // Get or create day note - directly pass the date string
            const startTime = Date.now();
            const dayNote = await dateNotes.getDayNote(date);
            const duration = Date.now() - startTime;

            if (!dayNote) {
                return {
                    success: false,
                    message: `Could not find or create daily note for ${date}`
                };
            }

            log.info(`Retrieved/created daily note for ${date} in ${duration}ms`);

            // Get parent month and year notes
            const yearStr = date.substring(0, 4);
            const monthStr = date.substring(0, 7);

            const monthNote = await dateNotes.getMonthNote(monthStr);
            const yearNote = await dateNotes.getYearNote(yearStr);

            // Return the note information
            return {
                success: true,
                date: date,
                dayNote: {
                    noteId: dayNote.noteId,
                    title: dayNote.title,
                    content: await dayNote.getContent()
                },
                monthNote: monthNote ? {
                    noteId: monthNote.noteId,
                    title: monthNote.title
                } : null,
                yearNote: yearNote ? {
                    noteId: yearNote.noteId,
                    title: yearNote.title
                } : null,
                message: `Retrieved daily note for ${date}`
            };
        } catch (error: any) {
            log.error(`Error getting daily note: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Helper method to get notes with a specific date attribute
     */
    private getNotesWithDateAttribute(date: string): any[] {
        // Find notes with matching dateNote attribute
        return attributes.getNotesWithLabel('dateNote', date) || [];
    }

    /**
     * Helper method to get all notes with any date attribute
     */
    private getAllNotesWithDateAttribute(): any[] {
        // Find all notes with dateNote attribute
        return attributes.getNotesWithLabel('dateNote') || [];
    }

    /**
     * Helper method to get year, month, and day notes for a date
     */
    private async getYearMonthDayNotes(date: string): Promise<{
        yearNote: any | null;
        monthNote: any | null;
        dayNote: any | null;
    }> {
        if (!this.isValidDate(date)) {
            return { yearNote: null, monthNote: null, dayNote: null };
        }

        // Extract the year and month from the date string
        const yearStr = date.substring(0, 4);
        const monthStr = date.substring(0, 7);

        // Use the dateNotes service to get the notes
        const yearNote = await dateNotes.getYearNote(yearStr);
        const monthNote = await dateNotes.getMonthNote(monthStr);
        const dayNote = await dateNotes.getDayNote(date);

        return { yearNote, monthNote, dayNote };
    }

    /**
     * Helper method to validate date string format
     */
    private isValidDate(dateString: string): boolean {
        const regex = /^\d{4}-\d{2}-\d{2}$/;

        if (!regex.test(dateString)) {
            return false;
        }

        const date = new Date(dateString);
        return date.toString() !== 'Invalid Date';
    }

    /**
     * Helper method to parse date string into components
     */
    private parseDateString(dateString: string): { year: number; month: number; day: number } | null {
        if (!this.isValidDate(dateString)) {
            return null;
        }

        const [yearStr, monthStr, dayStr] = dateString.split('-');

        return {
            year: parseInt(yearStr, 10),
            month: parseInt(monthStr, 10),
            day: parseInt(dayStr, 10)
        };
    }
}
