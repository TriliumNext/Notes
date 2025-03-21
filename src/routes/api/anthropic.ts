import axios from 'axios';
import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";

/**
 * List available models from Anthropic
 */
async function listModels(req: Request, res: Response) {
    try {
        const { baseUrl } = req.body;

        // Use provided base URL or default from options
        const anthropicBaseUrl = baseUrl || await options.getOption('anthropicBaseUrl') || 'https://api.anthropic.com/v1';
        const apiKey = await options.getOption('anthropicApiKey');

        if (!apiKey) {
            throw new Error('Anthropic API key is not configured');
        }

        // Call Anthropic API to get models
        const response = await axios.get(`${anthropicBaseUrl}/models`, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            timeout: 10000
        });

        // Process the models
        const allModels = response.data.models || [];

        // Separate models into chat models and embedding models
        const chatModels = allModels
            .filter((model: any) =>
                // Claude models are for chat
                model.id.includes('claude')
            )
            .map((model: any) => ({
                id: model.id,
                name: model.id,
                type: 'chat'
            }));

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
