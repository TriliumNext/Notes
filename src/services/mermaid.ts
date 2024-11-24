import elkLayouts from '@mermaid-js/layout-elk';
import type { MermaidConfig } from 'mermaid';

async function registerMermaidAddons() {
    // Register ELK layouts with mermaid
    (await import('mermaid')).default.registerLayoutLoaders(elkLayouts);
}

function loadMermaidConfig(): MermaidConfig {
    const documentStyle = window.getComputedStyle(document.documentElement);
    const mermaidTheme = documentStyle.getPropertyValue('--mermaid-theme');

    return {
        startOnLoad: false,
        theme: mermaidTheme.trim() as "default" | "base" | "dark" | "forest" | "neutral" | "null",
        securityLevel: 'antiscript'
    };
}

export default {
    registerMermaidAddons,
    loadMermaidConfig
};