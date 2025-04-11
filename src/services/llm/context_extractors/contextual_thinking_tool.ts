/**
 * Contextual Thinking Tool
 *
 * Provides a way for the LLM agent to expose its reasoning process to the user,
 * showing how it explores knowledge and reaches conclusions. This makes the
 * agent's thinking more transparent and allows users to understand the context
 * behind answers.
 *
 * Features:
 * - Capture and structure the agent's thinking steps
 * - Visualize reasoning chains for complex queries
 * - Expose confidence levels for different assertions
 * - Show how different sources of evidence are weighed
 */

import log from "../../log.js";
import aiServiceManager from "../ai_service_manager.js";
import { AGENT_TOOL_PROMPTS } from '../constants/llm_prompt_constants.js';

/**
 * Represents a single reasoning step taken by the agent
 */
export interface ThinkingStep {
    id: string;
    content: string;
    type: 'observation' | 'hypothesis' | 'question' | 'evidence' | 'conclusion';
    confidence?: number;
    sources?: string[];
    parentId?: string;
    children?: string[];
    metadata?: Record<string, unknown>;
}

/**
 * Contains the full reasoning process
 */
export interface ThinkingProcess {
    id: string;
    query: string;
    steps: ThinkingStep[];
    status: 'in_progress' | 'completed';
    startTime: number;
    endTime?: number;
}

export class ContextualThinkingTool {
    private static thinkingCounter = 0;
    private static stepCounter = 0;
    private activeProcId?: string;
    private processes: Record<string, ThinkingProcess> = {};

    /**
     * Start a new thinking process for a query
     *
     * @param query The user's query
     * @returns The created thinking process ID
     */
    startThinking(query: string): string {
        const thinkingId = `thinking_${Date.now()}_${ContextualThinkingTool.thinkingCounter++}`;

        log.info(`Starting thinking process: ${thinkingId} for query "${query.substring(0, 50)}..."`);

        this.processes[thinkingId] = {
            id: thinkingId,
            query,
            steps: [],
            status: 'in_progress',
            startTime: Date.now()
        };

        // Set as active process
        this.activeProcId = thinkingId;

        // Initialize with some starter thinking steps
        this.addThinkingStep(thinkingId, {
            type: 'observation',
            content: AGENT_TOOL_PROMPTS.CONTEXTUAL_THINKING.STARTING_ANALYSIS(query)
        });

        this.addThinkingStep(thinkingId, {
            type: 'question',
            content: AGENT_TOOL_PROMPTS.CONTEXTUAL_THINKING.KEY_COMPONENTS
        });

        this.addThinkingStep(thinkingId, {
            type: 'observation',
            content: AGENT_TOOL_PROMPTS.CONTEXTUAL_THINKING.BREAKING_DOWN
        });

        return thinkingId;
    }

    /**
     * Add a thinking step to a process
     *
     * @param processId The ID of the process to add to
     * @param step The thinking step to add
     * @returns The ID of the added step
     */
    addThinkingStep(
        processId: string,
        step: Omit<ThinkingStep, 'id'>,
        parentId?: string
    ): string {
        const process = this.processes[processId];

        if (!process) {
            throw new Error(`Thinking process ${processId} not found`);
        }

        // Create full step with ID
        const fullStep: ThinkingStep = {
            id: `step_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            ...step,
            parentId
        };

        // Add to process steps
        process.steps.push(fullStep);

        // If this step has a parent, update the parent's children list
        if (parentId) {
            const parentStep = process.steps.find(s => s.id === parentId);
            if (parentStep) {
                if (!parentStep.children) {
                    parentStep.children = [];
                }
                parentStep.children.push(fullStep.id);
            }
        }

        // Log the step addition with more detail
        log.info(`Added thinking step to process ${processId}: [${step.type}] ${step.content.substring(0, 100)}...`);

        return fullStep.id;
    }

    /**
     * Complete the current thinking process
     *
     * @param processId The ID of the process to complete (defaults to active process)
     * @returns The completed thinking process
     */
    completeThinking(processId?: string): ThinkingProcess | null {
        const id = processId || this.activeProcId;

        if (!id || !this.processes[id]) {
            log.error(`Thinking process ${id} not found`);
            return null;
        }

        this.processes[id].status = 'completed';
        this.processes[id].endTime = Date.now();

        if (id === this.activeProcId) {
            this.activeProcId = undefined;
        }

        return this.processes[id];
    }

    /**
     * Get a thinking process by ID
     */
    getThinkingProcess(processId: string): ThinkingProcess | null {
        return this.processes[processId] || null;
    }

    /**
     * Get the active thinking process
     */
    getActiveThinkingProcess(): ThinkingProcess | null {
        if (!this.activeProcId) return null;
        return this.processes[this.activeProcId] || null;
    }

    /**
     * Visualize the thinking process as HTML for display in the UI
     *
     * @param thinkingId The ID of the thinking process to visualize
     * @returns HTML representation of the thinking process
     */
    visualizeThinking(thinkingId: string): string {
        log.info(`Visualizing thinking process: thinkingId=${thinkingId}`);

        const process = this.getThinkingProcess(thinkingId);
        if (!process) {
            log.info(`No thinking process found for id: ${thinkingId}`);
            return "<div class='thinking-process'>No thinking process found</div>";
        }

        log.info(`Found thinking process with ${process.steps.length} steps for query: "${process.query.substring(0, 50)}..."`);

        let html = "<div class='thinking-process'>";
        html += `<h4>Reasoning Process</h4>`;
        html += `<div class='thinking-query'>${process.query}</div>`;

        // Show overall time taken for the thinking process
        const duration = process.endTime ?
            Math.round((process.endTime - process.startTime) / 1000) :
            Math.round((Date.now() - process.startTime) / 1000);

        html += `<div class='thinking-meta'>Analysis took ${duration} seconds</div>`;

        // Create a more structured visualization with indentation for parent-child relationships
        const renderStep = (step: ThinkingStep, level: number = 0) => {
            const indent = level * 20; // 20px indentation per level

            let stepHtml = `<div class='thinking-step ${step.type || ""}' style='margin-left: ${indent}px'>`;

            // Add an icon based on step type
            const icon = this.getStepIcon(step.type);
            stepHtml += `<span class='bx ${icon}'></span> `;

            // Add the step content
            stepHtml += step.content;

            // Show confidence if available
            if (step.metadata?.confidence) {
                const confidence = Math.round((step.metadata.confidence as number) * 100);
                stepHtml += ` <span class='thinking-confidence'>(Confidence: ${confidence}%)</span>`;
            }

            // Show sources if available
            if (step.sources && step.sources.length > 0) {
                stepHtml += `<div class='thinking-sources'>Sources: ${step.sources.join(', ')}</div>`;
            }

            stepHtml += `</div>`;

            return stepHtml;
        };

        // Helper function to render a step and all its children recursively
        const renderStepWithChildren = (stepId: string, level: number = 0) => {
            const step = process.steps.find(s => s.id === stepId);
            if (!step) return '';

            let html = renderStep(step, level);

            if (step.children && step.children.length > 0) {
                for (const childId of step.children) {
                    html += renderStepWithChildren(childId, level + 1);
                }
            }

            return html;
        };

        // Render top-level steps and their children
        const topLevelSteps = process.steps.filter(s => !s.parentId);
        for (const step of topLevelSteps) {
            html += renderStep(step);

            if (step.children && step.children.length > 0) {
                for (const childId of step.children) {
                    html += renderStepWithChildren(childId, 1);
                }
            }
        }

        html += "</div>";
        return html;
    }

    /**
     * Get an appropriate icon for a thinking step type
     */
    private getStepIcon(type: string): string {
        switch (type) {
            case 'observation':
                return 'bx-search';
            case 'hypothesis':
                return 'bx-bulb';
            case 'evidence':
                return 'bx-list-check';
            case 'conclusion':
                return 'bx-check-circle';
            default:
                return 'bx-message-square-dots';
        }
    }

    /**
     * Get a plain text summary of the thinking process
     *
     * @param thinkingId The ID of the thinking process to summarize
     * @returns Text summary of the thinking process
     */
    getThinkingSummary(thinkingId: string): string {
        const process = this.getThinkingProcess(thinkingId);
        if (!process) {
            log.error(`No thinking process found for id: ${thinkingId}`);
            return "No thinking process available.";
        }

        let summary = `## Reasoning Process for Query: "${process.query}"\n\n`;

        // Group steps by type for better organization
        const observations = process.steps.filter(s => s.type === 'observation');
        const questions = process.steps.filter(s => s.type === 'question');
        const hypotheses = process.steps.filter(s => s.type === 'hypothesis');
        const evidence = process.steps.filter(s => s.type === 'evidence');
        const conclusions = process.steps.filter(s => s.type === 'conclusion');

        log.info(`Generating thinking summary with: ${observations.length} observations, ${questions.length} questions, ${hypotheses.length} hypotheses, ${evidence.length} evidence, ${conclusions.length} conclusions`);

        // Add observations
        if (observations.length > 0) {
            summary += "### Observations:\n";
            observations.forEach(step => {
                summary += `- ${step.content}\n`;
            });
            summary += "\n";
        }

        // Add questions
        if (questions.length > 0) {
            summary += "### Questions Considered:\n";
            questions.forEach(step => {
                summary += `- ${step.content}\n`;
            });
            summary += "\n";
        }

        // Add hypotheses
        if (hypotheses.length > 0) {
            summary += "### Hypotheses:\n";
            hypotheses.forEach(step => {
                summary += `- ${step.content}\n`;
            });
            summary += "\n";
        }

        // Add evidence
        if (evidence.length > 0) {
            summary += "### Evidence Gathered:\n";
            evidence.forEach(step => {
                summary += `- ${step.content}\n`;
            });
            summary += "\n";
        }

        // Add conclusions
        if (conclusions.length > 0) {
            summary += "### Conclusions:\n";
            conclusions.forEach(step => {
                summary += `- ${step.content}\n`;
            });
            summary += "\n";
        }

        log.info(`Generated thinking summary with ${summary.length} characters`);
        return summary;
    }

    /**
     * Reset the active thinking process
     */
    resetActiveThinking(): void {
        this.activeProcId = undefined;
    }

    /**
     * Generate a unique ID for a thinking process
     */
    private generateProcessId(): string {
        return `thinking_${Date.now()}_${ContextualThinkingTool.thinkingCounter++}`;
    }

    /**
     * Generate a unique ID for a thinking step
     */
    private generateStepId(): string {
        return `step_${Date.now()}_${ContextualThinkingTool.stepCounter++}`;
    }

    /**
     * Format duration between two timestamps
     */
    private formatDuration(start: number, end: number): string {
        const durationMs = end - start;
        if (durationMs < 1000) {
            return `${durationMs}ms`;
        } else if (durationMs < 60000) {
            return `${Math.round(durationMs / 1000)}s`;
        } else {
            return `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;
        }
    }

    /**
     * Recursively render a step and its children
     */
    private renderStepTree(step: ThinkingStep, allSteps: ThinkingStep[]): string {
        const typeIcons: Record<string, string> = {
            'observation': '🔍',
            'hypothesis': '🤔',
            'question': '❓',
            'evidence': '📋',
            'conclusion': '✅'
        };

        const icon = typeIcons[step.type] || '•';
        const confidenceDisplay = step.confidence !== undefined
            ? `<span class="confidence">${Math.round(step.confidence * 100)}%</span>`
            : '';

        let html = `
      <div class="thinking-step thinking-${step.type}">
        <div class="step-header">
          <span class="step-icon">${icon}</span>
          <span class="step-type">${step.type}</span>
          ${confidenceDisplay}
        </div>
        <div class="step-content">${step.content}</div>
    `;

        // Add sources if available
        if (step.sources && step.sources.length > 0) {
            html += `<div class="step-sources">Sources: ${step.sources.join(', ')}</div>`;
        }

        // Recursively render children
        if (step.children && step.children.length > 0) {
            html += `<div class="step-children">`;

            for (const childId of step.children) {
                const childStep = allSteps.find(s => s.id === childId);
                if (childStep) {
                    html += this.renderStepTree(childStep, allSteps);
                }
            }

            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }
}

export default ContextualThinkingTool;
