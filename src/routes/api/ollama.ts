import axios from 'axios';
import options from "../../services/options.js";
import log from "../../services/log.js";
import type { Request, Response } from "express";

/**
 * List available models from Ollama
 */
async function listModels(req: Request, res: Response) {
    try {
        const { baseUrl } = req.body;

        // Use provided base URL or default from options
        const ollamaBaseUrl = baseUrl || await options.getOption('ollamaBaseUrl') || 'http://localhost:11434';

        // Call Ollama API to get models
        const response = await axios.get(`${ollamaBaseUrl}/api/tags?format=json`, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        // Return the models list
        const models = response.data.models || [];

        // Important: don't use "return res.send()" - just return the data
        return {
            success: true,
            models: models
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
