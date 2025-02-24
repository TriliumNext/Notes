import { fileURLToPath } from "url";
import { dirname, join } from "path";
import swaggerJsdoc from 'swagger-jsdoc';
import fs from "fs";

/*
 * Usage: npm run generate-openapi | tail -n1 > x.json
 *
 * Inspect generated file by opening it in https://editor-next.swagger.io/
 *
 */

const options = {
  definition: {
    openapi: '3.1.1',
    info: {
      title: 'Trilium Notes - Sync server API',
      version: '0.96.6',
      description: "This is the internal sync server API used by Trilium Notes / TriliumNext Notes.\n\n_If you're looking for the officially supported External Trilium API, see [here](https://triliumnext.github.io/Docs/Wiki/etapi.html)._\n\nThis page does not yet list all routes. For a full list, see the [route controller](https://github.com/TriliumNext/Notes/blob/v0.91.6/src/routes/routes.ts).",
      contact: {
        name: "TriliumNext issue tracker",
        url: "https://github.com/TriliumNext/Notes/issues",
      },
      license: {
        name: "GNU Free Documentation License 1.3 (or later)",
        url: "https://www.gnu.org/licenses/fdl-1.3",
      },
    },
  },
  apis: [
    // Put individual files here to have them ordered first.
    './src/routes/api/setup.ts',
    // all other files
    './src/routes/api/*.ts', './bin/generate-openapi.js'
  ],
};

const openapiSpecification = swaggerJsdoc(options);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(scriptDir, "..", "src", "routes", "api", "openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(openapiSpecification));
console.log("Saved to ", outputPath);

/**
 * @swagger
 * tags:
 *   - name: auth
 *     description: Authentication
 *   - name: sync
 *     description: Synchronization
 *   - name: data
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Attribute:
 *       type: object
 *       properties:
 *         attributeId:
 *           type: string
 *           example: "4G1DPrI58PAb"
 *         noteId:
 *           $ref: "#/components/schemas/NoteId"
 *         type:
 *           type: string
 *           enum: ["attribute", "relation"]
 *         name:
 *           type: string
 *           example: "internalLink"
 *         value:
 *           type: string
 *           example: "hA8aHSpTRdZ6"
 *           description: "If type = \"relation\", a note ID. Otherwise, the attribute content."
 *         position:
 *           type: integer
 *           example: 20
 *         isInheritable:
 *           type: boolean
 *     Blob:
 *       type: object
 *       properties:
 *         blobId:
 *           type: string
 *           example: "8iqMIB8eiY1tPYmElfjm"
 *         content:
 *           type:
 *             - string
 *             - 'null'
 *           description: "`null` if not text."
 *         contentLength:
 *           type: integer
 *         dateModified:
 *           $ref: "#/components/schemas/DateTime"
 *         utcDateModified:
 *           $ref: "#/components/schemas/UtcDateTime"
 *     Branch:
 *       type: object
 *       properties:
 *         branchId:
 *           $ref: "#/components/schemas/BranchId"
 *         noteId:
 *           $ref: "#/components/schemas/NoteId"
 *         parentNoteId:
 *           $ref: "#/components/schemas/NoteId"
 *         notePosition:
 *           type: integer
 *           example: 20
 *         prefix:
 *           type:
 *             - string
 *             - 'null'
 *         isExpanded:
 *           type: boolean
 *     BranchId:
 *       type: string
 *       example: "WUjhaGp4EKah_ur11rSfHkzeV"
 *       description: Equal to `{parentNoteId}_{noteId}`
 *     DateTime:
 *       type: string
 *       example: "2025-02-14 08:19:59.203+0100"
 *     EntityChange:
 *       type: object
 *       properties:
 *         entityChange:
 *           type: object
 *           properties:
 *             entityName:
 *               type: string
 *               example: "notes"
 *               description: Database table for this entity.
 *             changeId:
 *               type: string
 *               example: "changeId9630"
 *               description: ID, referenced in `entity_changes` table.
 *         entity:
 *           type: object
 *           description: Encoded entity data. Object has one property for each database column.
 *     Note:
 *       type: object
 *       properties:
 *         noteId:
 *           $ref: "#/components/schemas/NoteId"
 *         title:
 *           type: string
 *         isProtected:
 *           type: boolean
 *         type:
 *           type: string
 *           example: "text"
 *           enum: ["text", "code", "render", "file", "image", "search", "relationMap", "book", "noteMap", "mermaid", "canvas", "webView", "launcher", "doc", "contentWidget", "mindMap", "geoMap"]
 *           description: "[Reference list](https://github.com/TriliumNext/Notes/blob/v0.91.6/src/services/note_types.ts)"
 *         mime:
 *           type: string
 *           example: "text/html"
 *         blobId:
 *           type: string
 *           example: "z4PhNX7vuL3xVChQ1m2A"
 *     NoteId:
 *       type: string
 *       example: "ur11rSfHkzeV"
 *       description: "12-character note ID. Special values: \"none\"`, `\"root\"."
 *     Timestamps:
 *       type: object
 *       properties:
 *         dateCreated:
 *           $ref: "#/components/schemas/DateTime"
 *         dateModified:
 *           $ref: "#/components/schemas/DateTime"
 *         utcDateCreated:
 *           $ref: "#/components/schemas/UtcDateTime"
 *         utcDateModified:
 *           $ref: "#/components/schemas/UtcDateTime"
 *     UtcDateTime:
 *       type: string
 *       example: "2025-02-13T07:42:47.698Z"
 *       description: "Result of `new Date().toISOString().replace('T', ' ')`"
 *   securitySchemes:
 *     user-password:
 *       type: apiKey
 *       name: trilium-cred
 *       in: header
 *       description: "Username and password, formatted as `user:password`"
 *     session:
 *       type: apiKey
 *       in: cookie
 *       name: trilium.sid
 */
