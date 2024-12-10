import server from "./server.js";
import appContext from "../components/app_context.js";
import shortcutService from "./shortcuts.js";
import geminiService from "./gemini.js";


const keyboardActionRepo = {};

const keyboardActionsLoaded = server.get('keyboard-actions').then(actions => {
	actions = actions.filter(a => !!a.actionName); // filter out separators

	for (const action of actions) {
		action.effectiveShortcuts = action.effectiveShortcuts.filter(shortcut => !shortcut.startsWith("global:"));

		keyboardActionRepo[action.actionName] = action;
	}

	return actions;
});

async function getActions() {
	return await keyboardActionsLoaded;
}

async function getActionsForScope(scope) {
	const actions = await keyboardActionsLoaded;

	return actions.filter(action => action.scope === scope);
}

async function setupActionsForElement(scope, $el, component) {
	const actions = await getActionsForScope(scope);

	for (const action of actions) {
		for (const shortcut of action.effectiveShortcuts) {
			shortcutService.bindElShortcut($el, shortcut, () => component.triggerCommand(action.actionName, {ntxId: appContext.tabManager.activeNtxId}));
		}
	}
}

(async () => {
    const actions = await getActionsForScope("window");

    $(document).on('keydown', async (e) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 's': // CMD/CTRL + S
                case 'n': // CMD/CTRL + N
                    e.preventDefault();
                    return false;
                case 'l': // CMD/CTRL + L
                    const activeContext = appContext.tabManager.getActiveContext();
                    if (activeContext) {
                        await activeContext.getTextEditor(async editor => {
                            const selection = editor.model.document.selection;
                            const range = selection.getFirstRange();
                            let selectedText = '';
                            if (!selection.isCollapsed) {
                                selectedText = Array.from(range.getItems())
                                    .map(item => item.data || '')
                                    .join('');
                                if (selectedText.length > 100) {
                                    selectedText = selectedText.substring(0, 97) + '...';
                                }
								selectedText += '\n\n'
                            }
                            const user_command = prompt(`${selectedText}${EDIT_SELECTION_PROMPT}`);
                            
                            if (!user_command) {
                                return;
                            }

                            let model_command = getConsoleChatPrompt(selectedText, '', user_command);
                            
                            if (!selection.isCollapsed) {
                                const selectedText = Array.from(range.getItems())
                                    .map(item => item.data || '')
                                    .join('');
                                
                                model_command += ": " + selectedText;
                            }

                            const stream = await geminiService.streamGenerateContent(model_command);
                            const reader = stream.getReader();
                            
                            // Store the original position where we'll insert text
                            const insertPosition = selection.getFirstPosition();
                            
                            // If there's a selection, remove it first
                            if (!selection.isCollapsed) {
                                editor.model.change(writer => {
                                    writer.remove(range);
                                });
                            }

                            let completeResponse = '';
                            let lastInsertedLength = 0;
            
                            try {
                                while (true) {
                                    const {done, value} = await reader.read();
                                    if (done) break;
                                    
                                    const chunk = new TextDecoder().decode(value);
                                    const cleanChunk = chunk
                                        .replace(/^-+$/gm, '')     
                                        .replace(/^\[/, '')        
                                        .replace(/\]$/, '')     
                                        .replace(/^,\s*/, '');
                                    const chunkJSON = JSON.parse(cleanChunk);
                                    const chunkText = chunkJSON.candidates?.[0]?.content?.parts?.[0]?.text;
                                    
                                    if (chunkText) {
                                        completeResponse += chunkText;
                                        
                                        editor.model.change(writer => {
                                            // Remove previously inserted content
                                            if (lastInsertedLength > 0) {
                                                const removeRange = writer.createRange(
                                                    insertPosition,
                                                    writer.createPositionAt(insertPosition.parent, insertPosition.offset + lastInsertedLength)
                                                );
                                                writer.remove(removeRange);
                                            }
                                            
                                            // Insert new complete response
                                            const lines = completeResponse.split(/\r?\n/);
                                            let currentOffset = 0;
                                            
                                            for (let i = 0; i < lines.length; i++) {
                                                writer.insertText(
                                                    lines[i], 
                                                    writer.createPositionAt(insertPosition.parent, insertPosition.offset + currentOffset)
                                                );
                                                currentOffset += lines[i].length;
                                                
                                                if (i < lines.length - 1) {
                                                    writer.insertElement(
                                                        'softBreak',
                                                        writer.createPositionAt(insertPosition.parent, insertPosition.offset + currentOffset)
                                                    );
                                                    currentOffset += 1;
                                                }
                                            }
                                            
                                            lastInsertedLength = currentOffset;
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Streaming error:', error);
                            }
                        });
                    }
                    e.preventDefault();
                    return false;
            }
        }
    });

    for (const action of actions) {
        for (const shortcut of action.effectiveShortcuts) {
            shortcutService.bindGlobalShortcut(shortcut, () => appContext.triggerCommand(action.actionName, {ntxId: appContext.tabManager.activeNtxId}));
        }
    }
})();

async function getAction(actionName, silent = false) {
	await keyboardActionsLoaded;

	const action = keyboardActionRepo[actionName];

	if (!action) {
		if (silent) {
			console.debug(`Cannot find action '${actionName}'`);
		}
		else {
			throw new Error(`Cannot find action '${actionName}'`);
		}
	}

	return action;
}

function updateDisplayedShortcuts($container) {
	$container.find('kbd[data-command]').each(async (i, el) => {
		const actionName = $(el).attr('data-command');
		const action = await getAction(actionName, true);

		if (action) {
			const keyboardActions = action.effectiveShortcuts.join(', ');

			if (keyboardActions || $(el).text() !== "not set") {
				$(el).text(keyboardActions);
			}
		}
	});

	$container.find('[data-trigger-command]').each(async (i, el) => {
		const actionName = $(el).attr('data-trigger-command');
		const action = await getAction(actionName, true);

		if (action) {
			const title = $(el).attr('title');
			const shortcuts = action.effectiveShortcuts.join(', ');

			if (title?.includes(shortcuts)) {
				return;
			}

			const newTitle = !title?.trim() ? shortcuts : `${title} (${shortcuts})`;

			$(el).attr('title', newTitle);
		}
	});
}

export default {
	updateDisplayedShortcuts,
	setupActionsForElement,
	getActions,
	getActionsForScope
};
