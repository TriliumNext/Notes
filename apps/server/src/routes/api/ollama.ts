import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";
import { Ollama } from "ollama";

/**
 * @swagger
 * /api/llm/providers/ollama/models:
 *   get:
 *     summary: List available models from Ollama
 *     operationId: ollama-list-models
 *     parameters:
 *       - name: baseUrl
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional custom Ollama API base URL
 *     responses:
 *       '200':
 *         description: List of available Ollama models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *       '500':
 *         description: Error listing models
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function listModels(req: Request, res: Response) {
    try {
        const baseUrl = req.query.baseUrl as string || await options.getOption('ollamaBaseUrl') || 'http://localhost:11434';

        // Create Ollama client
        const ollama = new Ollama({ host: baseUrl });
        
        // Call Ollama API to get models using the official client
        const response = await ollama.list();

        // Return the models list
        return {
            success: true,
            models: response.models || []
        };
    } catch (error: any) {
        log.error(`Error listing Ollama models: ${error.message || 'Unknown error'}`);

        // Properly throw the error to be handled by the global error handler
        throw new Error(`Failed to list Ollama models: ${error.message || 'Unknown error'}`);
    }
}

export default {
    listModels
};
