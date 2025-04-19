/**
 * Message processing functions for LLM Chat
 */
import type { ToolExecutionStep } from "./types.js";

/**
 * Extract tool execution steps from the DOM that are within the chat flow
 */
export function extractInChatToolSteps(chatMessagesElement: HTMLElement): ToolExecutionStep[] {
    const steps: ToolExecutionStep[] = [];

    // Look for tool execution in the chat flow
    const toolExecutionElement = chatMessagesElement.querySelector('.chat-tool-execution');

    if (toolExecutionElement) {
        // Find all tool step elements
        const stepElements = toolExecutionElement.querySelectorAll('.tool-step');

        stepElements.forEach(stepEl => {
            const stepHtml = stepEl.innerHTML;

            // Determine the step type based on icons or classes present
            let type = 'info';
            let name: string | undefined;
            let content = '';

            if (stepHtml.includes('bx-code-block')) {
                type = 'executing';
                content = 'Executing tools...';
            } else if (stepHtml.includes('bx-terminal')) {
                type = 'result';
                // Extract the tool name from the step
                const nameMatch = stepHtml.match(/<span[^>]*>Tool: ([^<]+)<\/span>/);
                name = nameMatch ? nameMatch[1] : 'unknown';

                // Extract the content from the div with class mt-1 ps-3
                const contentEl = stepEl.querySelector('.mt-1.ps-3');
                content = contentEl ? contentEl.innerHTML : '';
            } else if (stepHtml.includes('bx-error-circle')) {
                type = 'error';
                const nameMatch = stepHtml.match(/<span[^>]*>Tool: ([^<]+)<\/span>/);
                name = nameMatch ? nameMatch[1] : 'unknown';

                const contentEl = stepEl.querySelector('.mt-1.ps-3.text-danger');
                content = contentEl ? contentEl.innerHTML : '';
            } else if (stepHtml.includes('bx-message-dots')) {
                type = 'generating';
                content = 'Generating response with tool results...';
            } else if (stepHtml.includes('bx-loader-alt')) {
                // Skip the initializing spinner
                return;
            }

            steps.push({ type, name, content });
        });
    }

    return steps;
}
