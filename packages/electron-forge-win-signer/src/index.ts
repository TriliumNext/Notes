import { DefaultArtifactClient } from "@actions/artifact";
import path from "path";
import crypto from "crypto";

export default async function sign(filePath: string) {
    log(`Preparing to sign ${filePath}`);

    await uploadArtifact(filePath);
}

async function uploadArtifact(artifactPath: string) {
    const artifactClient = new DefaultArtifactClient();
    const artifactName = generateArtifactName(artifactPath);

    log(`Uploading path "${artifactPath}" as "${artifactName}"...`);
    await artifactClient.uploadArtifact(artifactName, [ artifactPath ], path.dirname(artifactPath));
    log("Upload complete.");

    return artifactName;
}

function generateArtifactName(artifactPath: string) {
    const fileName = path.basename(artifactPath);
    const randomId = crypto.randomBytes(8).toString();
    return `${fileName}-${randomId}`;
}

function log(...args) {
    console.log(`[WIN-SIGN] `, ...args);
}
