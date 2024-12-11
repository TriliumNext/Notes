import express from 'express';
import llmService from '../../services/llm/llm_service.js';

export async function chat(req: express.Request, res: express.Response, next: express.NextFunction) {
    const { messages, context } = req.body;

    try {
        const response = await llmService.chat(messages, context);
        res.json({ response });
    } catch (error) {
        next(error);
    }
}

export async function generateEmbeddings(req: express.Request, res: express.Response, next: express.NextFunction) {
    const { noteId } = req.params;
    const { text } = req.body;

    try {
        const embeddingId = await llmService.generateEmbeddings(noteId, text);
        res.json({ embeddingId });
    } catch (error) {
        next(error);
    }
}

export async function getConfig(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const config = await llmService.getConfig();
        res.json(config);
    } catch (error) {
        next(error);
    }
}

export async function updateConfig(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        await llmService.updateConfig(req.body);
        const config = await llmService.getConfig();
        res.json(config);
    } catch (error) {
        next(error);
    }
}
