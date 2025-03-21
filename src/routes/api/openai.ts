import axios from 'axios';
import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";

/**
 * List available models from OpenAI
 */
async function listModels(req: Request, res: Response) {
    try {
        const { baseUrl } = req.body;

        // Use provided base URL or default from options
        const openaiBaseUrl = baseUrl || await options.getOption('openaiBaseUrl') || 'https://api.openai.com/v1';
        const apiKey = await options.getOption('openaiApiKey');

        if (!apiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        // Call OpenAI API to get models
        const response = await axios.get(`${openaiBaseUrl}/models`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000
        });

        // Filter and categorize models
        const allModels = response.data.data || [];

        // Separate models into chat models and embedding models
        const chatModels = allModels
            .filter((model: any) =>
                // Include GPT models for chat
                model.id.includes('gpt') ||
                // Include Claude models via Azure OpenAI
                model.id.includes('claude')
            )
            .map((model: any) => ({
                id: model.id,
                name: model.id,
                type: 'chat'
            }));

        const embeddingModels = allModels
            .filter((model: any) =>
                // Only include embedding-specific models
                model.id.includes('embedding') ||
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
        log.error(`Error listing OpenAI models: ${error.message || 'Unknown error'}`);

        // Properly throw the error to be handled by the global error handler
        throw new Error(`Failed to list OpenAI models: ${error.message || 'Unknown error'}`);
    }
}

export default {
    listModels
};

