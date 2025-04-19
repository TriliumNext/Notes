/**
 * Note Structure Navigator Tool
 *
 * This tool enables the LLM agent to navigate through the hierarchical
 * structure of notes in the knowledge base. It provides methods for:
 * - Finding paths between notes
 * - Exploring parent-child relationships
 * - Discovering note attributes and metadata
 * - Understanding the context of a note within the broader structure
 *
 * This helps the LLM agent provide more accurate and contextually relevant responses.
 */

import becca from '../../../becca/becca.js';
import log from '../../log.js';
import type BNote from '../../../becca/entities/bnote.js';
import type BAttribute from '../../../becca/entities/battribute.js';
import sql from "../../sql.js";
import { SEARCH_CONSTANTS } from "../constants/search_constants.js";

export interface NoteInfo {
  noteId: string;
  title: string;
  type: string;
  mime?: string;
  dateCreated?: string;
  dateModified?: string;
  isProtected: boolean;
  isArchived: boolean;
  attributeNames: string[];
  hasChildren: boolean;
}

export interface NotePathInfo {
  notePath: string[];
  notePathTitles: string[];
}

export interface NoteHierarchyLevel {
  noteId: string;
  title: string;
  level: number;
  children?: NoteHierarchyLevel[];
}

interface NoteStructure {
  noteId: string;
  title: string;
  type: string;
  childCount: number;
  attributes: Array<{name: string, value: string}>;
  parentPath: Array<{title: string, noteId: string}>;
}

export class NoteNavigatorTool {
  private maxPathLength: number = SEARCH_CONSTANTS.HIERARCHY.MAX_PATH_LENGTH;
  private maxBreadth: number = SEARCH_CONSTANTS.HIERARCHY.MAX_BREADTH;
  private maxDepth: number = SEARCH_CONSTANTS.HIERARCHY.MAX_DEPTH;

  /**
   * Error handler that properly types the error object
   */
  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message || String(error);
    }
    return String(error);
  }

  /**
   * Get detailed information about a note
   */
  getNoteInfo(noteId: string): NoteInfo | null {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return null;
      }

      // Get attribute names for this note
      const attributeNames = note.ownedAttributes
        .map(attr => attr.name)
        .filter((value, index, self) => self.indexOf(value) === index); // unique values

      return {
        noteId: note.noteId,
        title: note.title,
        type: note.type,
        mime: note.mime,
        dateCreated: note.dateCreated,
        dateModified: note.dateModified,
        isProtected: note.isProtected ?? false,
        isArchived: note.isArchived || false,
        attributeNames,
        hasChildren: note.children.length > 0
      };
    } catch (error: unknown) {
      log.error(`Error getting note info: ${this.handleError(error)}`);
      return null;
    }
  }

  /**
   * Get all paths to a note from the root
   */
  getNotePathsFromRoot(noteId: string): NotePathInfo[] {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return [];
      }

      // Get all possible paths to this note
      const allPaths = note.getAllNotePaths();
      if (!allPaths || allPaths.length === 0) {
        return [];
      }

      // Convert path IDs to titles
      return allPaths.map(path => {
        const titles = path.map(id => {
          const pathNote = becca.notes[id];
          return pathNote ? pathNote.title : id;
        });

        return {
          notePath: path,
          notePathTitles: titles
        };
      }).sort((a, b) => a.notePath.length - b.notePath.length); // Sort by path length, shortest first
    } catch (error: unknown) {
      log.error(`Error getting note paths: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Get a note's hierarchy (children up to specified depth)
   * This is useful for the LLM to understand the structure within a note's subtree
   */
  getNoteHierarchy(noteId: string, depth: number = 2): NoteHierarchyLevel | null {
    if (depth < 0 || depth > this.maxDepth) {
      depth = this.maxDepth;
    }

    try {
      const note = becca.notes[noteId];
      if (!note) {
        return null;
      }

      const result: NoteHierarchyLevel = {
        noteId: note.noteId,
        title: note.title,
        level: 0
      };

      // Recursively get children if depth allows
      if (depth > 0 && note.children.length > 0) {
        result.children = note.children
          .slice(0, this.maxBreadth)
          .map(child => this._getHierarchyLevel(child.noteId, 1, depth))
          .filter((node): node is NoteHierarchyLevel => node !== null);
      }

      return result;
    } catch (error: unknown) {
      log.error(`Error getting note hierarchy: ${this.handleError(error)}`);
      return null;
    }
  }

  /**
   * Recursive helper for getNoteHierarchy
   */
  private _getHierarchyLevel(noteId: string, currentLevel: number, maxDepth: number): NoteHierarchyLevel | null {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return null;
      }

      const result: NoteHierarchyLevel = {
        noteId: note.noteId,
        title: note.title,
        level: currentLevel
      };

      // Recursively get children if depth allows
      if (currentLevel < maxDepth && note.children.length > 0) {
        result.children = note.children
          .slice(0, this.maxBreadth)
          .map(child => this._getHierarchyLevel(child.noteId, currentLevel + 1, maxDepth))
          .filter((node): node is NoteHierarchyLevel => node !== null);
      }

      return result;
    } catch (error: unknown) {
      log.error(`Error in _getHierarchyLevel: ${this.handleError(error)}`);
      return null;
    }
  }

  /**
   * Get attributes of a note
   */
  getNoteAttributes(noteId: string): BAttribute[] {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return [];
      }

      return note.ownedAttributes;
    } catch (error: unknown) {
      log.error(`Error getting note attributes: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Find the shortest path between two notes
   */
  findPathBetweenNotes(fromNoteId: string, toNoteId: string): NotePathInfo | null {
    try {
      if (fromNoteId === toNoteId) {
        const note = becca.notes[fromNoteId];
        if (!note) return null;

        return {
          notePath: [fromNoteId],
          notePathTitles: [note.title]
        };
      }

      // Simple breadth-first search to find shortest path
      const visited = new Set<string>();
      const queue: Array<{noteId: string, path: string[], titles: string[]}> = [];

      // Initialize with the starting note
      const startNote = becca.notes[fromNoteId];
      if (!startNote) return null;

      queue.push({
        noteId: fromNoteId,
        path: [fromNoteId],
        titles: [startNote.title]
      });

      visited.add(fromNoteId);

      while (queue.length > 0 && queue[0].path.length <= this.maxPathLength) {
        const {noteId, path, titles} = queue.shift()!;
        const note = becca.notes[noteId];

        if (!note) continue;

        // Get IDs of all connected notes (parents and children)
        const connections: string[] = [
          ...note.parents.map(p => p.noteId),
          ...note.children.map(c => c.noteId)
        ];

        for (const connectedId of connections) {
          if (visited.has(connectedId)) continue;

          const connectedNote = becca.notes[connectedId];
          if (!connectedNote) continue;

          const newPath = [...path, connectedId];
          const newTitles = [...titles, connectedNote.title];

          // Check if we found the target
          if (connectedId === toNoteId) {
            return {
              notePath: newPath,
              notePathTitles: newTitles
            };
          }

          // Continue BFS
          queue.push({
            noteId: connectedId,
            path: newPath,
            titles: newTitles
          });

          visited.add(connectedId);
        }
      }

      // No path found
      return null;
    } catch (error: unknown) {
      log.error(`Error finding path between notes: ${this.handleError(error)}`);
      return null;
    }
  }

  /**
   * Search for notes by title
   */
  searchNotesByTitle(searchTerm: string, limit: number = SEARCH_CONSTANTS.HIERARCHY.MAX_NOTES_PER_QUERY): NoteInfo[] {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      searchTerm = searchTerm.toLowerCase();
      const results: NoteInfo[] = [];

      // Simple in-memory search through all notes
      for (const noteId in becca.notes) {
        if (results.length >= limit) break;

        const note = becca.notes[noteId];
        if (!note || note.isDeleted) continue;

        if (note.title.toLowerCase().includes(searchTerm)) {
          const info = this.getNoteInfo(noteId);
          if (info) results.push(info);
        }
      }

      return results;
    } catch (error: unknown) {
      log.error(`Error searching notes by title: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Get clones of a note (if any)
   */
  async getNoteClones(noteId: string): Promise<NoteInfo[]> {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return [];
      }

      // A note has clones if it has multiple parents
      if (note.parents.length <= 1) {
        return [];
      }

      // Return parent notes, which represent different contexts for this note
      const parents = await this.getParentNotes(noteId);
      return parents
        .map(parent => this.getNoteInfo(parent.noteId))
        .filter((info): info is NoteInfo => info !== null);
    } catch (error: unknown) {
      log.error(`Error getting note clones: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Generate a readable overview of a note's position in the hierarchy
   * This is useful for the LLM to understand the context of a note
   */
  async getNoteContextDescription(noteId: string): Promise<string> {
    try {
      const note = becca.notes[noteId];
      if (!note) {
        return "Note not found.";
      }

      const paths = this.getNotePathsFromRoot(noteId);
      if (paths.length === 0) {
        return `Note "${note.title}" exists but has no path from root.`;
      }

      let result = "";

      // Basic note info
      result += `Note: "${note.title}" (${note.type})\n`;

      // Is it cloned?
      if (paths.length > 1) {
        result += `This note appears in ${paths.length} different locations:\n`;

        // Show max paths to avoid overwhelming context
        for (let i = 0; i < Math.min(SEARCH_CONSTANTS.HIERARCHY.MAX_PATHS_TO_SHOW, paths.length); i++) {
          const path = paths[i];
          result += `${i+1}. ${path.notePathTitles.join(' > ')}\n`;
        }

        if (paths.length > SEARCH_CONSTANTS.HIERARCHY.MAX_PATHS_TO_SHOW) {
          result += `... and ${paths.length - SEARCH_CONSTANTS.HIERARCHY.MAX_PATHS_TO_SHOW} more locations\n`;
        }
      } else {
        // Just one path
        const path = paths[0];
        result += `Path: ${path.notePathTitles.join(' > ')}\n`;
      }

      // Children info using the async function
      const children = await this.getChildNotes(noteId, SEARCH_CONSTANTS.CONTEXT.MAX_POINTS);

      if (children.length > 0) {
        result += `\nContains ${note.children.length} child notes`;
        if (children.length < note.children.length) {
          result += ` (showing first ${children.length})`;
        }
        result += `:\n`;

        for (const child of children) {
          result += `- ${child.title}\n`;
        }

        if (children.length < note.children.length) {
          result += `... and ${note.children.length - children.length} more\n`;
        }
      } else {
        result += "\nThis note has no child notes.\n";
      }

      // Attributes summary
      const attributes = this.getNoteAttributes(noteId);
      if (attributes.length > 0) {
        result += `\nNote has ${attributes.length} attributes.\n`;

        // Group attributes by name
        const attrMap: Record<string, string[]> = {};
        for (const attr of attributes) {
          if (!attrMap[attr.name]) {
            attrMap[attr.name] = [];
          }
          attrMap[attr.name].push(attr.value);
        }

        for (const [name, values] of Object.entries(attrMap)) {
          if (values.length === 1) {
            result += `- ${name}: ${values[0]}\n`;
          } else {
            result += `- ${name}: ${values.length} values\n`;
          }
        }
      }

      return result;
    } catch (error: unknown) {
      log.error(`Error getting note context: ${this.handleError(error)}`);
      return "Error generating note context description.";
    }
  }

  /**
   * Get the structure of a note including its hierarchy and attributes
   *
   * @param noteId The ID of the note to get structure for
   * @returns Structure information about the note
   */
  async getNoteStructure(noteId: string): Promise<NoteStructure> {
    try {
      log.info(`Getting note structure for note ${noteId}`);

      // Special handling for 'root' or other special notes
      if (noteId === 'root' || !noteId) {
        log.info('Using root as the special note for structure');
        return {
          noteId: 'root',
          title: 'Root',
          type: 'root',
          childCount: 0, // We don't know how many direct children root has
          attributes: [],
          parentPath: []
        };
      }

      // Get the note from becca
      const note = becca.notes[noteId];

      if (!note) {
        log.error(`Note ${noteId} not found in becca.notes`);
        return {
          noteId,
          title: 'Unknown',
          type: 'unknown',
          childCount: 0,
          attributes: [],
          parentPath: []
        };
      }

      // Get child notes count
      const childCount = note.children.length;

      // Get attributes
      const attributes = note.getAttributes().map(attr => ({
        name: attr.name,
        value: attr.value
      }));

      // Build parent path
      const parentPath: Array<{title: string, noteId: string}> = [];
      let current = note.parents[0]; // Get first parent

      while (current && current.noteId !== 'root') {
        parentPath.unshift({
          title: current.title,
          noteId: current.noteId
        });

        current = current.parents[0];
      }

      return {
        noteId: note.noteId,
        title: note.title,
        type: note.type,
        childCount,
        attributes,
        parentPath
      };
    } catch (error: unknown) {
      log.error(`Error getting note structure: ${this.handleError(error)}`);
      // Return a minimal structure with empty arrays to avoid null errors
      return {
        noteId,
        title: 'Unknown',
        type: 'unknown',
        childCount: 0,
        attributes: [],
        parentPath: []
      };
    }
  }

  /**
   * Get child notes of a specified note
   */
  async getChildNotes(noteId: string, limit: number = SEARCH_CONSTANTS.CONTEXT.MAX_CHILDREN): Promise<Array<{noteId: string, title: string}>> {
    try {
      const note = becca.notes[noteId];

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      return note.children
        .slice(0, limit)
        .map(child => ({
          noteId: child.noteId,
          title: child.title
        }));
    } catch (error: unknown) {
      log.error(`Error getting child notes: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Get parent notes of a specified note
   */
  async getParentNotes(noteId: string): Promise<Array<{noteId: string, title: string}>> {
    try {
      const note = becca.notes[noteId];

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      return note.parents.map(parent => ({
        noteId: parent.noteId,
        title: parent.title
      }));
    } catch (error: unknown) {
      log.error(`Error getting parent notes: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Find notes linked to/from the specified note
   */
  async getLinkedNotes(noteId: string, limit: number = SEARCH_CONSTANTS.CONTEXT.MAX_LINKS): Promise<Array<{noteId: string, title: string, direction: 'from'|'to'}>> {
    try {
      const note = becca.notes[noteId];

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // Links from this note to others
      const outboundLinks = note.getRelations()
        .slice(0, Math.floor(limit / 2))
        .map(relation => ({
          noteId: relation.targetNoteId || '', // Ensure noteId is never undefined
          title: relation.name,
          direction: 'to' as const
        }))
        .filter(link => link.noteId !== ''); // Filter out any with empty noteId

      // Links from other notes to this one
      const inboundLinks: Array<{noteId: string, title: string, direction: 'from'}> = [];

      // Find all notes that have relations pointing to this note
      for (const relatedNoteId in becca.notes) {
        const relatedNote = becca.notes[relatedNoteId];
        if (relatedNote && !relatedNote.isDeleted) {
          const relations = relatedNote.getRelations();
          for (const relation of relations) {
            if (relation.targetNoteId === noteId) {
              inboundLinks.push({
                noteId: relatedNote.noteId,
                title: relation.name,
                direction: 'from'
              });

              // Break if we've found enough inbound links
              if (inboundLinks.length >= Math.floor(limit / 2)) {
                break;
              }
            }
          }

          // Break if we've found enough inbound links
          if (inboundLinks.length >= Math.floor(limit / 2)) {
            break;
          }
        }
      }

      return [...outboundLinks, ...inboundLinks.slice(0, Math.floor(limit / 2))];
    } catch (error: unknown) {
      log.error(`Error getting linked notes: ${this.handleError(error)}`);
      return [];
    }
  }

  /**
   * Get the full path of a note from root
   */
  async getNotePath(noteId: string): Promise<string> {
    try {
      const structure = await this.getNoteStructure(noteId);
      const path = structure.parentPath.map(p => p.title);
      path.push(structure.title);

      return path.join(' > ');
    } catch (error: unknown) {
      log.error(`Error getting note path: ${this.handleError(error)}`);
      return 'Unknown path';
    }
  }
}

export default NoteNavigatorTool;
