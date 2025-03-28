import axios from 'axios';
import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";
import { PROVIDER_CONSTANTS } from '../../services/llm/constants/provider_constants.js';

// Map of simplified model names to full model names with versions
const MODEL_MAPPING: Record<string, string> = {
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'claude-2': 'claude-2.1'
};

// Interface for Anthropic model entries
interface AnthropicModel {
    id: string;
    name: string;
    type: string;
}

/**
 * @swagger
 * /api/anthropic/models:
 *   post:
 *     summary: List available models from Anthropic
 *     operationId: anthropic-list-models
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseUrl:
 *                 type: string
 *                 description: Optional custom Anthropic API base URL
 *     responses:
 *       '200':
 *         description: List of available Anthropic models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 chatModels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                 embeddingModels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *       '500':
 *         description: Error listing models
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function listModels(req: Request, res: Response) {
    try {
        const { baseUrl } = req.body;

        // Use provided base URL or default from options, and ensure correct formatting
        let anthropicBaseUrl = baseUrl || await options.getOption('anthropicBaseUrl') || PROVIDER_CONSTANTS.ANTHROPIC.BASE_URL;
        // Ensure base URL doesn't already include '/v1' and is properly formatted
        anthropicBaseUrl = anthropicBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');

        const apiKey = await options.getOption('anthropicApiKey');

        if (!apiKey) {
            throw new Error('Anthropic API key is not configured');
        }

        log.info(`Listing models from Anthropic API at: ${anthropicBaseUrl}/v1/models`);

        // Call Anthropic API to get models
        const response = await axios.get(`${anthropicBaseUrl}/v1/models`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'anthropic-version': PROVIDER_CONSTANTS.ANTHROPIC.API_VERSION,
                'anthropic-beta': PROVIDER_CONSTANTS.ANTHROPIC.BETA_VERSION
            },
            timeout: 10000
        });

        // Process the models
        const allModels = response.data.models || [];

        // Log available models
        log.info(`Found ${allModels.length} models from Anthropic: ${allModels.map((m: any) => m.id).join(', ')}`);

        // Separate models into chat models and embedding models
        const chatModels = allModels
            .filter((model: any) =>
                // Claude models are for chat
                model.id.includes('claude')
            )
            .map((model: any) => {
                // Get a simplified name for display purposes
                let displayName = model.id;
                // Try to simplify the model name by removing version suffixes
                if (model.id.match(/claude-\d+-\w+-\d+/)) {
                    displayName = model.id.replace(/-\d+$/, '');
                }

                return {
                    id: model.id,      // Keep full ID for API calls
                    name: displayName, // Use simplified name for display
                    type: 'chat'
                };
            });

        // Also include known models that might not be returned by the API
        for (const model of PROVIDER_CONSTANTS.ANTHROPIC.AVAILABLE_MODELS) {
            // Check if this model is already in our list
            if (!chatModels.some((m: AnthropicModel) => m.id === model.id)) {
                chatModels.push({
                    id: model.id,
                    name: model.name,
                    type: 'chat'
                });
            }
        }

        // Note: Anthropic might not have embedding models yet, but we'll include this for future compatibility
        const embeddingModels = allModels
            .filter((model: any) =>
                // If Anthropic releases embedding models, they'd likely include 'embed' in the name
                model.id.includes('embed')
            )
            .map((model: any) => ({
                id: model.id,
                name: model.id,
                type: 'embedding'
            }));

        // Return the models list
        return {
            success: true,
            chatModels,
            embeddingModels
        };
    } catch (error: any) {
        log.error(`Error listing Anthropic models: ${error.message || 'Unknown error'}`);

        // Properly throw the error to be handled by the global error handler
        throw new Error(`Failed to list Anthropic models: ${error.message || 'Unknown error'}`);
    }
}

export default {
    listModels
};
