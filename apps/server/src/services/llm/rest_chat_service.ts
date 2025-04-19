/**
 * REST Chat Service
 *
 * This file is a wrapper for the modular implementation in the chat/ directory.
 * See chat/rest-chat-service.ts for the actual implementation.
 */

import restChatService from './chat/rest_chat_service.js';
export * from './interfaces/chat_session.js';
export default restChatService;
