/**
 * Formatter Constants
 *
 * Constants related to message formatters for different LLM providers.
 * This centralizes string formatting patterns, HTML cleaning options,
 * and other formatter-specific constants that were previously hardcoded.
 */

/**
 * HTML tag allowlists for different formatter strictness levels
 */
export const HTML_ALLOWED_TAGS = {
    // Standard set used by most formatters
    STANDARD: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'code', 'pre'],

    // Minimal set for providers with limited HTML support
    MINIMAL: ['b', 'i', 'p', 'br', 'a'],

    // Empty set for plain text only (Ollama)
    NONE: []
};

/**
 * HTML attribute allowlists
 */
export const HTML_ALLOWED_ATTRIBUTES = {
    // Standard set of allowed attributes
    STANDARD: {
        'a': ['href']
    },

    // Empty set for plain text only
    NONE: {}
};

/**
 * HTML tag transformations
 */
export const HTML_TRANSFORMS = {
    // Standard transformations
    STANDARD: {
        'h1': 'h2',
        'h2': 'h3',
        'div': 'p',
        'span': 'span'
    }
};

/**
 * RegEx patterns for HTML to Markdown conversion
 */
export const HTML_TO_MARKDOWN_PATTERNS = {
    // Headings
    HEADING_1: { pattern: /<h1[^>]*>(.*?)<\/h1>/gi, replacement: '# $1\n' },
    HEADING_2: { pattern: /<h2[^>]*>(.*?)<\/h2>/gi, replacement: '## $1\n' },
    HEADING_3: { pattern: /<h3[^>]*>(.*?)<\/h3>/gi, replacement: '### $1\n' },
    HEADING_4: { pattern: /<h4[^>]*>(.*?)<\/h4>/gi, replacement: '#### $1\n' },
    HEADING_5: { pattern: /<h5[^>]*>(.*?)<\/h5>/gi, replacement: '##### $1\n' },

    // Paragraph and line breaks
    PARAGRAPH: { pattern: /<p[^>]*>(.*?)<\/p>/gi, replacement: '$1\n\n' },
    BREAK: { pattern: /<br[^>]*>/gi, replacement: '\n' },

    // Links and formatting
    LINK: { pattern: /<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, replacement: '[$2]($1)' },
    STRONG: { pattern: /<strong[^>]*>(.*?)<\/strong>/gi, replacement: '**$1**' },
    BOLD: { pattern: /<b[^>]*>(.*?)<\/b>/gi, replacement: '**$1**' },
    EMPHASIS: { pattern: /<em[^>]*>(.*?)<\/em>/gi, replacement: '*$1*' },
    ITALIC: { pattern: /<i[^>]*>(.*?)<\/i>/gi, replacement: '*$1*' },

    // Code
    INLINE_CODE: { pattern: /<code[^>]*>(.*?)<\/code>/gi, replacement: '`$1`' },
    CODE_BLOCK: { pattern: /<pre[^>]*>(.*?)<\/pre>/gi, replacement: '```\n$1\n```' },

    // Clean up
    ANY_REMAINING_TAG: { pattern: /<[^>]*>/g, replacement: '' },
    EXCESSIVE_NEWLINES: { pattern: /\n{3,}/g, replacement: '\n\n' }
};

/**
 * HTML entity replacements
 */
export const HTML_ENTITY_REPLACEMENTS = {
    // Common HTML entities
    NBSP: { pattern: /&nbsp;/g, replacement: ' ' },
    LT: { pattern: /&lt;/g, replacement: '<' },
    GT: { pattern: /&gt;/g, replacement: '>' },
    AMP: { pattern: /&amp;/g, replacement: '&' },
    QUOT: { pattern: /&quot;/g, replacement: '"' },
    APOS: { pattern: /&#39;/g, replacement: "'" },
    LDQUO: { pattern: /&ldquo;/g, replacement: '"' },
    RDQUO: { pattern: /&rdquo;/g, replacement: '"' },
    LSQUO: { pattern: /&lsquo;/g, replacement: "'" },
    RSQUO: { pattern: /&rsquo;/g, replacement: "'" },
    MDASH: { pattern: /&mdash;/g, replacement: '—' },
    NDASH: { pattern: /&ndash;/g, replacement: '–' },
    HELLIP: { pattern: /&hellip;/g, replacement: '…' }
};

/**
 * Encoding issue fixes
 */
export const ENCODING_FIXES = {
    // Common encoding issues
    BROKEN_QUOTES: { pattern: /Γ\u00c2[\u00a3\u00a5]/g, replacement: '"' },

    // Character replacements for Unicode
    UNICODE_REPLACEMENTS: {
        '\u00A0': ' ',  // Non-breaking space
        '\u2018': "'",  // Left single quote
        '\u2019': "'",  // Right single quote
        '\u201C': '"',  // Left double quote
        '\u201D': '"',  // Right double quote
        '\u2013': '-',  // En dash
        '\u2014': '--', // Em dash
        '\u2022': '*',  // Bullet
        '\u2026': '...' // Ellipsis
    }
};

/**
 * Ollama-specific cleaning patterns
 */
export const OLLAMA_CLEANING = {
    // Replace fancy quotes
    QUOTES: { pattern: /[""]/g, replacement: '"' },
    APOSTROPHES: { pattern: /['']/g, replacement: "'" },

    // Replace other Unicode characters
    DASHES: { pattern: /[–—]/g, replacement: '-' },
    BULLETS: { pattern: /[•]/g, replacement: '*' },
    ELLIPSES: { pattern: /[…]/g, replacement: '...' },

    // Remove non-ASCII characters
    NON_ASCII: { pattern: /[^\x00-\x7F]/g, replacement: '' },

    // Normalize whitespace
    WHITESPACE: { pattern: /\s+/g, replacement: ' ' },
    NEWLINE_WHITESPACE: { pattern: /\n\s+/g, replacement: '\n' }
};

/**
 * Console log messages for formatters
 */
export const FORMATTER_LOGS = {
    ANTHROPIC: {
        PROCESSED: (before: number, after: number) => `Anthropic formatter: ${before} messages → ${after} messages`
    },
    OPENAI: {
        PROCESSED: (before: number, after: number) => `OpenAI formatter: ${before} messages → ${after} messages`
    },
    OLLAMA: {
        PROCESSED: (before: number, after: number) => `Ollama formatter processed ${before} messages into ${after} messages`
    },
    ERROR: {
        CONTEXT_CLEANING: (provider: string) => `Error cleaning content for ${provider}:`,
        ENCODING: 'Error fixing encoding issues:'
    }
};

/**
 * Message formatter text templates
 */
export const MESSAGE_FORMATTER_TEMPLATES = {
    /**
     * OpenAI-specific message templates
     */
    OPENAI: {
        CONTEXT_INSTRUCTION: 'Please use the following context to respond to the user\'s messages:\n\n'
    },

    /**
     * Anthropic-specific message templates
     */
    ANTHROPIC: {
        CONTEXT_START: '\n\n<context>\n',
        CONTEXT_END: '\n</context>'
    },

    /**
     * Ollama-specific message templates
     */
    OLLAMA: {
        REFERENCE_INFORMATION: '\n\nReference information:\n'
    },

    /**
     * Default formatter message templates
     */
    DEFAULT: {
        CONTEXT_INSTRUCTION: 'Here is context to help you answer my questions: '
    }
};

/**
 * Provider identifier constants
 */
export const PROVIDER_IDENTIFIERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    OLLAMA: 'ollama',
    DEFAULT: 'default'
};
