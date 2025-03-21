/**
 * Agent Executor
 *
 * This class provides the core functionality for executing agents with tools in Trilium Notes.
 * It handles:
 * - Managing tool registration and execution
 * - Coordinating the LLM interaction flow
 * - Processing function calls from the LLM
 * - Managing the conversation state and context
 * - Handling errors and retries
 */

import { v4 as uuidv4 } from 'uuid';
import log from '../../../services/log.js';
import type { Message } from './agent_interface.js';
import aiServiceManager from '../ai_service_manager.js';
import contextService from '../context_service.js';
import { ContextualThinkingTool } from './contextual_thinking_tool.js';
import type {
  AgentTool,
  AgentExecution,
  AgentMessage,
  FunctionCall,
  IAgentExecutor,
  ToolExecutionResult,
  AgentConfig
} from './agent_interface.js';
import { AgentInterfaces } from './agent_interface.js';
import type { Message as AIMessage } from '../ai_interface.js';

// Default prompt templates for the agent
const DEFAULT_SYSTEM_PROMPT = `You are an AI agent that helps users find and understand information in their Trilium Notes knowledge base.
You have access to several tools that can help you find information and navigate the notes structure.
When the user asks a question, you should use these tools to find relevant information and provide a helpful response.
Always be concise and to the point while being accurate and helpful.

Remember:
1. Use tools to find information - don't make things up
2. Break down complex queries into smaller, manageable steps
3. Explain your reasoning if needed
4. Be respectful of the user's time
5. When searching for information, try to be precise and narrow your search
6. Use multiple tools in combination to get the best results

You will be provided with tools in the following JSON schema format:
{
  "name": "tool_name",
  "description": "Description of what the tool does",
  "parameters": {
    "param1": {
      "type": "string",
      "description": "Description of parameter"
    }
  }
}

When you want to use a tool, use the following format in your response:
\`\`\`json
{"name": "tool_name", "arguments": {"param1": "value1"}}
\`\`\`

You can call multiple tools by including multiple tool calls in your response.`;

/**
 * Executor class that manages the execution of agents with tools
 */
export class AgentExecutor implements IAgentExecutor {
  private registeredTools: Map<string, AgentTool> = new Map();
  private contextualThinking: ContextualThinkingTool;
  private executionCache: Map<string, AgentExecution> = new Map();

  constructor() {
    this.contextualThinking = new ContextualThinkingTool();
    log.info('AgentExecutor initialized');
  }

  /**
   * Register a tool with the agent executor
   *
   * @param tool The tool to register
   */
  registerTool(tool: AgentTool): void {
    if (this.registeredTools.has(tool.name)) {
      log.warn(`Tool with name ${tool.name} already registered, overwriting`);
    }
    this.registeredTools.set(tool.name, tool);
    log.info(`Registered tool: ${tool.name}`);
  }

  /**
   * Get all registered tools
   */
  getTools(): AgentTool[] {
    return Array.from(this.registeredTools.values());
  }

  /**
   * Get a specific tool by name
   *
   * @param name The name of the tool to get
   */
  getTool(name: string): AgentTool | undefined {
    return this.registeredTools.get(name);
  }

  /**
   * Execute an agent with the given query and tools
   *
   * @param query The user's query
   * @param tools The tools available to the agent (if not provided, uses all registered tools)
   * @param options Configuration options
   * @returns The result of the agent execution
   */
  async execute(
    query: string,
    tools?: AgentTool[],
    options: Record<string, unknown> = {}
  ): Promise<AgentExecution> {
    const executionId = uuidv4();
    const availableTools = tools || Array.from(this.registeredTools.values());
    const contextNoteId = options.contextNoteId || 'root';

    // Create a new execution record
    const execution: AgentExecution = {
      id: executionId,
      query,
      contextNoteId,
      messages: [],
      status: 'created',
      toolResults: [],
      startTime: Date.now()
    };

    // Store in cache
    this.executionCache.set(executionId, execution);

    // Start thinking process if enabled
    let thinkingId: string | undefined;
    if (options.showThinking) {
      thinkingId = this.contextualThinking.startThinking(query);
      this.contextualThinking.addThinkingStep(thinkingId, {
        type: 'observation',
        content: `Starting agent execution for query: "${query}" with ${availableTools.length} available tools`
      });
    }

    try {
      // Mark execution as running
      execution.status = 'running';

      // Build the system prompt
      const systemPrompt = this.buildSystemPrompt(availableTools, options);

      // Get enhanced context for the query
      let enhancedContext = "";
      try {
        enhancedContext = await contextService.getAgentToolsContext(
          contextNoteId,
          query,
          options.showThinking || false
        );

        if (thinkingId && enhancedContext) {
          this.contextualThinking.addThinkingStep(thinkingId, {
            type: 'observation',
            content: `Retrieved enhanced context: ${enhancedContext.length} characters`
          });
        }
      } catch (error) {
        log.error(`Error getting enhanced context: ${error}`);
        if (thinkingId) {
          this.contextualThinking.addThinkingStep(thinkingId, {
            type: 'observation',
            content: `Error getting enhanced context: ${error}`
          });
        }
      }

      // Create messages array
      const messages: Message[] = [
        {
          role: 'system',
          content: systemPrompt + (enhancedContext ? `\n\nContext information:\n${enhancedContext}` : '')
        },
        {
          role: 'user',
          content: query
        }
      ];

      execution.messages = [...messages];

      // Start the conversation loop
      const maxIterations = options.maxIterations || 10;
      let iterationCount = 0;
      let done = false;

      while (!done && iterationCount < maxIterations) {
        iterationCount++;
        log.info(`Agent execution iteration ${iterationCount}/${maxIterations}`);

        if (thinkingId) {
          this.contextualThinking.addThinkingStep(thinkingId, {
            type: 'observation',
            content: `Starting iteration ${iterationCount}/${maxIterations}`
          });
        }

        // Get response from LLM
        const llmResponse = await this.getLLMResponse(execution.messages);
        execution.messages.push({
          role: 'assistant',
          content: llmResponse.content
        });

        // Check if there are function calls to execute
        if (llmResponse.functionCalls && llmResponse.functionCalls.length > 0) {
          if (thinkingId) {
            this.contextualThinking.addThinkingStep(thinkingId, {
              type: 'observation',
              content: `LLM requested ${llmResponse.functionCalls.length} tool executions`
            });
          }

          // Execute each function call
          for (const functionCall of llmResponse.functionCalls) {
            const result = await this.executeToolCall(functionCall, availableTools, thinkingId);
            execution.toolResults.push(result);

            // Add function result to messages
            execution.messages.push({
              role: 'function',
              name: functionCall.name,
              content: JSON.stringify(result.result)
            });
          }
        } else {
          // No function calls, we're done
          done = true;
          execution.finalResponse = llmResponse.content;

          if (thinkingId) {
            this.contextualThinking.addThinkingStep(thinkingId, {
              type: 'conclusion',
              content: `Agent completed execution with final response: "${llmResponse.content.substring(0, 100)}..."`
            });
          }
        }
      }

      // Check if we hit the iteration limit
      if (iterationCount >= maxIterations && !done) {
        log.warn(`Agent execution hit iteration limit (${maxIterations})`);
        if (thinkingId) {
          this.contextualThinking.addThinkingStep(thinkingId, {
            type: 'conclusion',
            content: `Agent execution hit iteration limit (${maxIterations})`
          });
        }

        // Get final response with a prompt explaining we hit the limit
        const finalMessages = [...execution.messages, {
          role: 'user',
          content: `You've made ${iterationCount} tool calls, which is the maximum allowed. Please provide your final answer based on the information gathered so far.`
        }];

        const finalResponse = await this.getLLMResponse(finalMessages);
        execution.finalResponse = finalResponse.content;
      }

      // Mark execution as completed
      execution.status = 'completed';
      execution.endTime = Date.now();

      // Complete thinking process
      if (thinkingId) {
        this.contextualThinking.completeThinking(thinkingId);
      }

      return execution;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error in agent execution: ${errorMessage}`);

      // Update execution with error
      execution.status = 'failed';
      execution.error = errorMessage;
      execution.endTime = Date.now();

      // Complete thinking process with error
      if (thinkingId) {
        this.contextualThinking.addThinkingStep(thinkingId, {
          type: 'observation',
          content: `Error in agent execution: ${error.message}`
        });
        this.contextualThinking.completeThinking(thinkingId);
      }

      return execution;
    }
  }

  /**
   * Get an execution by ID
   *
   * @param executionId The ID of the execution to get
   */
  getExecution(executionId: string): AgentExecution | undefined {
    return this.executionCache.get(executionId);
  }

  /**
   * Build the system prompt for the agent
   *
   * @param tools The tools available to the agent
   * @param options Configuration options
   */
  private buildSystemPrompt(tools: AgentTool[], options: AgentConfig = {}): string {
    let prompt = DEFAULT_SYSTEM_PROMPT;

    // Add additional instructions if provided
    if (options.additionalInstructions) {
      prompt += `\n\n${options.additionalInstructions}`;
    }

    // Add tools to prompt
    prompt += '\n\nAvailable tools:\n';

    for (const tool of tools) {
      prompt += `\n## ${tool.name}\n`;
      prompt += `${tool.description}\n`;
      prompt += `Parameters:\n`;

      for (const [paramName, paramDetails] of Object.entries(tool.parameters)) {
        const details = paramDetails as { description: string; type: string };
        prompt += `- ${paramName}: ${details.description} (${details.type})\n`;
      }
    }

    return prompt;
  }

  /**
   * Get a response from the LLM with the current messages
   *
   * @param messages The current conversation messages
   */
  private async getLLMResponse(messages: Message[]): Promise<AgentMessage> {
    try {
      // Convert our Message type to the AIMessage type expected by aiServiceManager
      const aiMessages: AIMessage[] = messages.filter(m => m.role !== 'function').map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // Generate chat completion directly using the aiServiceManager
      const completion = await aiServiceManager.generateChatCompletion(aiMessages, {
        temperature: 0.2 // Lower temperature for more focused responses
      });

      return this.parseAgentMessage(completion.text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error getting LLM response: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Parse a message from the agent to extract function calls
   *
   * @param message The message from the agent
   */
  private parseAgentMessage(message: string): AgentMessage {
    // Check if message contains function calls
    const functionCallRegex = /```json\s*(\{.*?\})\s*```/gs;
    const matches = [...message.matchAll(functionCallRegex)];

    if (matches.length === 0) {
      // No function calls
      return { content: message };
    }

    // Extract function calls
    const functionCalls: FunctionCall[] = [];
    let cleanedMessage = message;

    for (const match of matches) {
      try {
        const functionCallJson = match[1];
        const functionCall = JSON.parse(functionCallJson);
        functionCalls.push(functionCall);

        // Remove function call from message
        cleanedMessage = cleanedMessage.replace(match[0], '');
      } catch (error) {
        log.error(`Error parsing function call: ${error}`);
      }
    }

    // Clean up the message text by removing extra newlines and whitespace
    cleanedMessage = cleanedMessage.trim().replace(/\n{3,}/g, '\n\n');

    return {
      content: cleanedMessage,
      functionCalls
    };
  }

  /**
   * Execute a tool call
   *
   * @param functionCall The function call to execute
   * @param availableTools The available tools
   * @param thinkingId Optional thinking process ID
   */
  private async executeToolCall(
    functionCall: FunctionCall,
    availableTools: AgentTool[],
    thinkingId?: string
  ): Promise<ToolExecutionResult> {
    const { name, arguments: args } = functionCall;

    try {
      // Find the tool
      const tool = availableTools.find(t => t.name === name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      if (thinkingId) {
        this.contextualThinking.addThinkingStep(thinkingId, {
          type: 'observation',
          content: `Executing tool: ${name} with arguments: ${JSON.stringify(args)}`
        });
      }

      // Execute the tool
      const result = await tool.execute(args);

      if (thinkingId) {
        this.contextualThinking.addThinkingStep(thinkingId, {
          type: 'observation',
          content: `Tool execution result: ${typeof result === 'object' ? JSON.stringify(result).substring(0, 100) + '...' : result}`
        });
      }

      return {
        toolName: name,
        result,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error executing tool ${name}: ${errorMessage}`);

      if (thinkingId) {
        this.contextualThinking.addThinkingStep(thinkingId, {
          type: 'observation',
          content: `Error executing tool ${name}: ${errorMessage}`
        });
      }

      return {
        toolName: name,
        result: null,
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
const agentExecutor = new AgentExecutor();
export default agentExecutor;