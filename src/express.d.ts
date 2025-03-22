import { Session } from "express-session";

export declare module "express-serve-static-core" {
    interface Request {
        session: Session & {
            loggedIn: boolean;
        };
        headers: {
            "x-local-date"?: string;
            "x-labels"?: string;

            authorization?: string;
            "trilium-cred"?: string;
            "x-csrf-token"?: string;

            "trilium-component-id"?: string;
            "trilium-local-now-datetime"?: string;
            "trilium-hoisted-note-id"?: string;
        };
    }
}
