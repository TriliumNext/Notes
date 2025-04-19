import { BasePipelineStage } from '../pipeline_stage.js';
import type { PipelineInput } from '../interfaces.js';
import aiServiceManager from '../../ai_service_manager.js';
import log from '../../../log.js';

export interface AgentToolsContextInput {
    noteId?: string;
    query?: string;
    showThinking?: boolean;
}

export interface AgentToolsContextOutput {
    context: string;
    noteId: string;
    query: string;
}

/**
 * Pipeline stage for adding LLM agent tools context
 */
export class AgentToolsContextStage {
    constructor() {
        log.info('AgentToolsContextStage initialized');
    }

    /**
     * Execute the agent tools context stage
     */
    async execute(input: AgentToolsContextInput): Promise<AgentToolsContextOutput> {
        return this.process(input);
    }

    /**
     * Process the input and add agent tools context
     */
    protected async process(input: AgentToolsContextInput): Promise<AgentToolsContextOutput> {
        const noteId = input.noteId || 'global';
        const query = input.query || '';
        const showThinking = !!input.showThinking;

        log.info(`AgentToolsContextStage: Getting agent tools context for noteId=${noteId}, query="${query.substring(0, 30)}...", showThinking=${showThinking}`);

        try {
            // Use the AI service manager to get agent tools context
            const context = await aiServiceManager.getAgentToolsContext(noteId, query, showThinking);

            log.info(`AgentToolsContextStage: Generated agent tools context (${context.length} chars)`);

            return {
                context,
                noteId,
                query
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`AgentToolsContextStage: Error getting agent tools context: ${errorMessage}`);
            throw error;
        }
    }
}
