export default function sanitizeAttributeName(origName: string) {
    const fixedName = origName === "" ? "unnamed" : origName.replace(/[^\p{L}\p{N}_:]/gu, "_");
    // any not allowed character should be replaced with underscore

    return fixedName;
}
