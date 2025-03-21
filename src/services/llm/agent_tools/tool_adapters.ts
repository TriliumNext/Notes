/**
 * Tool Adapters
 * 
 * This file provides adapters for existing Trilium Notes tools to make them compatible
 * with the agent interface. It wraps existing tool implementations with the standardized
 * AgentTool interface for consistent usage by the agent system.
 */

import log from '../../log.js';
import type { AgentTool } from './agent_interface.js';
import { AgentInterfaces } from './agent_interface.js';
import { VectorSearchTool } from './vector_search_tool.js';
import { NoteNavigatorTool } from './note_navigator_tool.js';
import { QueryDecompositionTool } from './query_decomposition_tool.js';
import { ContextualThinkingTool } from './contextual_thinking_tool.js';

/**
 * Create a vector search tool adapter
 * 
 * @param vectorSearchTool The vector search tool to adapt
 */
export function createVectorSearchToolAdapter(vectorSearchTool: VectorSearchTool): AgentTool {
  return {
    name: 'vector_search',
    description: 'Search for semantically relevant notes using vector embeddings. This tool helps find information even when exact keywords are not present.',
    parameters: {
      query: {
        type: 'string',
        description: 'The search query to find semantically similar notes'
      },
      contextNoteId: {
        type: 'string',
        description: 'Optional note ID to restrict search context. If not provided, searches across all notes.',
        required: false
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        required: false
      },
      threshold: {
        type: 'number',
        description: 'Minimum similarity score (0-1) for results',
        required: false
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const query = parameters.query as string;
        log.info(`Executing vector search with query: ${query}`);
        
        const searchOptions = {
          limit: (parameters.limit as number) || 10,
          threshold: (parameters.threshold as number) || 0.5,
          includeContent: true
        };
        
        const results = await vectorSearchTool.search(
          query,
          parameters.contextNoteId as string | undefined,
          searchOptions
        );
        
        return {
          results: results.map(result => ({
            noteId: result.noteId,
            title: result.title,
            similarity: result.similarity,
            contentPreview: result.contentPreview,
            parentId: result.parentId,
            dateCreated: result.dateCreated,
            dateModified: result.dateModified
          })),
          count: results.length,
          query
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in vector search tool adapter: ${errorMessage}`);
        throw error;
      }
    }
  };
}

/**
 * Create a note navigator tool adapter
 * 
 * @param noteNavigatorTool The note navigator tool to adapt
 */
export function createNoteNavigatorToolAdapter(noteNavigatorTool: NoteNavigatorTool): AgentTool[] {
  // Create multiple tool adapters for different functionalities
  const getNoteInfoTool: AgentTool = {
    name: 'get_note_info',
    description: 'Get detailed information about a specific note, including its attributes, type, and metadata.',
    parameters: {
      noteId: {
        type: 'string',
        description: 'The ID of the note to get information for'
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const noteId = parameters.noteId as string;
        log.info(`Getting note info for: ${noteId}`);
        const noteInfo = noteNavigatorTool.getNoteInfo(noteId);
        
        if (!noteInfo) {
          throw new Error(`Note with ID ${noteId} not found`);
        }
        
        return noteInfo;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in get_note_info tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  const getNoteStructureTool: AgentTool = {
    name: 'get_note_structure',
    description: 'Get the hierarchical structure of a note, including its parent path, child notes, and attributes.',
    parameters: {
      noteId: {
        type: 'string',
        description: 'The ID of the note to get structure for'
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const noteId = parameters.noteId as string;
        log.info(`Getting note structure for: ${noteId}`);
        const noteStructure = await noteNavigatorTool.getNoteStructure(noteId);
        return noteStructure;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in get_note_structure tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  const getChildNotesTool: AgentTool = {
    name: 'get_child_notes',
    description: 'Get the child notes of a specific note.',
    parameters: {
      noteId: {
        type: 'string',
        description: 'The ID of the parent note'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of child notes to return',
        required: false
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const noteId = parameters.noteId as string;
        const limit = (parameters.limit as number) || 20;
        
        log.info(`Getting child notes for: ${noteId}`);
        const childNotes = await noteNavigatorTool.getChildNotes(
          noteId,
          limit
        );
        
        return {
          noteId,
          childNotes,
          count: childNotes.length
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in get_child_notes tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  const getParentNotesTool: AgentTool = {
    name: 'get_parent_notes',
    description: 'Get the parent notes of a specific note.',
    parameters: {
      noteId: {
        type: 'string',
        description: 'The ID of the note to get parents for'
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const noteId = parameters.noteId as string;
        log.info(`Getting parent notes for: ${noteId}`);
        const parentNotes = await noteNavigatorTool.getParentNotes(noteId);
        
        return {
          noteId,
          parentNotes,
          count: parentNotes.length
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in get_parent_notes tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  const searchNotesByTitleTool: AgentTool = {
    name: 'search_notes_by_title',
    description: 'Search for notes by title using a keyword search.',
    parameters: {
      searchTerm: {
        type: 'string',
        description: 'The search term to find in note titles'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        required: false
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const searchTerm = parameters.searchTerm as string;
        const limit = (parameters.limit as number) || 10;
        
        log.info(`Searching notes by title: ${searchTerm}`);
        const results = noteNavigatorTool.searchNotesByTitle(
          searchTerm,
          limit
        );
        
        return {
          searchTerm,
          results,
          count: results.length
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in search_notes_by_title tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  const getNotePath: AgentTool = {
    name: 'get_note_path',
    description: 'Get the full path of a note from the root of the hierarchy.',
    parameters: {
      noteId: {
        type: 'string',
        description: 'The ID of the note to get path for'
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const noteId = parameters.noteId as string;
        log.info(`Getting note path for: ${noteId}`);
        const path = await noteNavigatorTool.getNotePath(noteId);
        
        return {
          noteId,
          path
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in get_note_path tool: ${errorMessage}`);
        throw error;
      }
    }
  };
  
  // Return all the tool adapters
  return [
    getNoteInfoTool,
    getNoteStructureTool,
    getChildNotesTool,
    getParentNotesTool,
    searchNotesByTitleTool,
    getNotePath
  ];
}

/**
 * Create a query decomposition tool adapter
 * 
 * @param queryDecompositionTool The query decomposition tool to adapt
 */
export function createQueryDecompositionToolAdapter(queryDecompositionTool: QueryDecompositionTool): AgentTool {
  return {
    name: 'decompose_query',
    description: 'Break down a complex query into simpler sub-queries that can be more easily answered.',
    parameters: {
      query: {
        type: 'string',
        description: 'The complex query to decompose'
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const query = parameters.query as string;
        log.info(`Decomposing query: ${query}`);
        const decomposedQuery = queryDecompositionTool.decomposeQuery(query);
        
        return {
          originalQuery: query,
          complexity: decomposedQuery.complexity,
          subQueries: decomposedQuery.subQueries.map(sq => ({
            text: sq.text,
            reason: sq.reason
          }))
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in decompose_query tool: ${errorMessage}`);
        throw error;
      }
    }
  };
}

/**
 * Create a contextual thinking tool adapter
 * 
 * @param contextualThinkingTool The contextual thinking tool to adapt
 */
export function createContextualThinkingToolAdapter(contextualThinkingTool: ContextualThinkingTool): AgentTool {
  return {
    name: 'explain_thinking',
    description: 'Record and explain your thinking process about the current query.',
    parameters: {
      thought: {
        type: 'string',
        description: 'The thought or reasoning to record'
      },
      type: {
        type: 'string',
        description: 'The type of thinking step (observation, hypothesis, evidence, conclusion)',
        required: false
      }
    },
    execute: async (parameters: Record<string, unknown>) => {
      try {
        const thought = parameters.thought as string;
        log.info(`Recording thinking: ${thought.substring(0, 50)}...`);
        
        // Get active thinking process or create a new one
        const activeProcess = contextualThinkingTool.getActiveThinkingProcess();
        const thinkingId = activeProcess ? activeProcess.id : contextualThinkingTool.startThinking('Current query');
        
        // Add the thinking step
        const stepType = (parameters.type as string) || 'observation';
        const stepId = contextualThinkingTool.addThinkingStep(thinkingId, {
          type: stepType as 'observation' | 'hypothesis' | 'question' | 'evidence' | 'conclusion',
          content: thought
        });
        
        return {
          thinkingId,
          stepId,
          recorded: true
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error in explain_thinking tool: ${errorMessage}`);
        throw error;
      }
    }
  };
}

/**
 * Create a consolidated list of all adapted tools
 * 
 * @param vectorSearchTool The vector search tool
 * @param noteNavigatorTool The note navigator tool
 * @param queryDecompositionTool The query decomposition tool
 * @param contextualThinkingTool The contextual thinking tool
 */
export function createAgentTools(
  vectorSearchTool: VectorSearchTool,
  noteNavigatorTool: NoteNavigatorTool,
  queryDecompositionTool: QueryDecompositionTool,
  contextualThinkingTool: ContextualThinkingTool
): AgentTool[] {
  const vectorSearchAdapter = createVectorSearchToolAdapter(vectorSearchTool);
  const noteNavigatorAdapters = createNoteNavigatorToolAdapter(noteNavigatorTool);
  const queryDecompositionAdapter = createQueryDecompositionToolAdapter(queryDecompositionTool);
  const contextualThinkingAdapter = createContextualThinkingToolAdapter(contextualThinkingTool);
  
  return [
    vectorSearchAdapter,
    ...noteNavigatorAdapters,
    queryDecompositionAdapter,
    contextualThinkingAdapter
  ];
}