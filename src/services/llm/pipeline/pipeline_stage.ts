import type { PipelineInput, PipelineOutput, PipelineStage } from './interfaces.js';
import log from '../../log.js';

/**
 * Abstract base class for pipeline stages
 */
export abstract class BasePipelineStage<TInput extends PipelineInput, TOutput extends PipelineOutput> implements PipelineStage<TInput, TOutput> {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Execute the pipeline stage
     */
    async execute(input: TInput): Promise<TOutput> {
        try {
            log.info(`Executing pipeline stage: ${this.name}`);
            const startTime = Date.now();
            const result = await this.process(input);
            const endTime = Date.now();
            log.info(`Pipeline stage ${this.name} completed in ${endTime - startTime}ms`);
            return result;
        } catch (error: any) {
            log.error(`Error in pipeline stage ${this.name}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process the input and produce output
     * This is the main method that each pipeline stage must implement
     */
    protected abstract process(input: TInput): Promise<TOutput>;
}
