import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";
import OpenAI from "openai";

/**
 * @swagger
 * /api/openai/models:
 *   post:
 *     summary: List available models from OpenAI
 *     operationId: openai-list-models
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseUrl:
 *                 type: string
 *                 description: Optional custom OpenAI API base URL
 *     responses:
 *       '200':
 *         description: List of available OpenAI models
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

        // Use provided base URL or default from options
        const openaiBaseUrl = baseUrl || await options.getOption('openaiBaseUrl') || 'https://api.openai.com/v1';
        const apiKey = await options.getOption('openaiApiKey');

        if (!apiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        // Initialize OpenAI client with the API key and base URL
        const openai = new OpenAI({
            apiKey,
            baseURL: openaiBaseUrl
        });

        // Call OpenAI API to get models using the SDK
        const response = await openai.models.list();

        // Filter and categorize models
        const allModels = response.data || [];

        // Separate models into chat models and embedding models
        const chatModels = allModels
            .filter((model) =>
                // Include GPT models for chat
                model.id.includes('gpt') ||
                // Include Claude models via Azure OpenAI
                model.id.includes('claude')
            )
            .map((model) => ({
                id: model.id,
                name: model.id,
                type: 'chat'
            }));

        const embeddingModels = allModels
            .filter((model) =>
                // Only include embedding-specific models
                model.id.includes('embedding') ||
                model.id.includes('embed')
            )
            .map((model) => ({
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

