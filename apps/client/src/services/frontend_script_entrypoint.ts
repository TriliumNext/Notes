/**
 * The front script API is accessible to code notes with the "JS (frontend)" language.
 *
 * The entire API is exposed as a single global: {@link api}
 *
 * @module Frontend Script API
 */

/**
 * This file creates the entrypoint for TypeDoc that simulates the context from within a
 * script note.
 *
 * Make sure to keep in line with frontend's `script_context.ts`.
 */

export type { default as BasicWidget } from "../widgets/basic_widget.js";
export type { default as FAttachment } from "../entities/fattachment.js";
export type { default as FAttribute } from "../entities/fattribute.js";
export type { default as FBranch } from "../entities/fbranch.js";
export type { default as FNote } from "../entities/fnote.js";
export type { Api } from "./frontend_script_api.js";
export type { default as NoteContextAwareWidget } from "../widgets/note_context_aware_widget.js";
export type { default as RightPanelWidget } from "../widgets/right_panel_widget.js";

import FrontendScriptApi, { type Api } from "./frontend_script_api.js";

//@ts-expect-error
export const api: Api = new FrontendScriptApi();
