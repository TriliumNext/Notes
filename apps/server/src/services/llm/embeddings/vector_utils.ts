import { SEARCH_CONSTANTS } from '../constants/search_constants.js';

/**
 * Computes the cosine similarity between two vectors
 * If dimensions don't match, automatically adapts using the enhanced approach
 * @param normalize Optional flag to normalize vectors before comparison (default: false)
 * @param sourceModel Optional identifier for the source model
 * @param targetModel Optional identifier for the target model
 * @param contentType Optional content type for strategy selection
 * @param performanceProfile Optional performance profile
 */
export function cosineSimilarity(
    a: Float32Array,
    b: Float32Array,
    normalize: boolean = false,
    sourceModel?: string,
    targetModel?: string,
    contentType?: ContentType,
    performanceProfile?: PerformanceProfile
): number {
    // Use the enhanced approach that preserves more information
    return enhancedCosineSimilarity(a, b, normalize, sourceModel, targetModel, contentType, performanceProfile);
}

/**
 * Enhanced cosine similarity that adaptively handles different dimensions
 * Instead of truncating larger embeddings, it pads smaller ones to preserve information
 * @param normalize Optional flag to normalize vectors before comparison (default: false)
 * @param sourceModel Optional identifier for the source model
 * @param targetModel Optional identifier for the target model
 * @param contentType Optional content type for strategy selection
 * @param performanceProfile Optional performance profile
 */
export function enhancedCosineSimilarity(
    a: Float32Array,
    b: Float32Array,
    normalize: boolean = false,
    sourceModel?: string,
    targetModel?: string,
    contentType?: ContentType,
    performanceProfile?: PerformanceProfile
): number {
    // If normalization is requested, normalize vectors first
    if (normalize) {
        a = normalizeVector(a);
        b = normalizeVector(b);
    }

    // If dimensions match, use standard calculation
    if (a.length === b.length) {
        return standardCosineSimilarity(a, b);
    }

    // Log dimension adaptation
    debugLog(`Dimension mismatch: ${a.length} vs ${b.length}. Adapting dimensions...`, 'info');

    // Determine if models are different
    const isCrossModelComparison = sourceModel !== targetModel &&
                                  sourceModel !== undefined &&
                                  targetModel !== undefined;

    // Context for strategy selection
    const context: StrategySelectionContext = {
        contentType: contentType || ContentType.GENERAL_TEXT,
        performanceProfile: performanceProfile || PerformanceProfile.BALANCED,
        sourceDimension: a.length,
        targetDimension: b.length,
        sourceModel,
        targetModel,
        isCrossModelComparison
    };

    // Select the optimal strategy based on context
    let adaptOptions: AdaptationOptions;

    if (a.length > b.length) {
        // Pad b to match a's dimensions
        debugLog(`Adapting embedding B (${b.length}D) to match A (${a.length}D)`, 'debug');

        // Get optimal strategy
        adaptOptions = selectOptimalPaddingStrategy(context);
        const adaptedB = adaptEmbeddingDimensions(b, a.length, adaptOptions);

        // Record stats
        recordAdaptationStats({
            operation: 'dimension_adaptation',
            sourceModel: targetModel,
            targetModel: sourceModel,
            sourceDimension: b.length,
            targetDimension: a.length,
            strategy: adaptOptions.strategy
        });

        return standardCosineSimilarity(a, adaptedB);
    } else {
        // Pad a to match b's dimensions
        debugLog(`Adapting embedding A (${a.length}D) to match B (${b.length}D)`, 'debug');

        // Get optimal strategy
        adaptOptions = selectOptimalPaddingStrategy(context);
        const adaptedA = adaptEmbeddingDimensions(a, b.length, adaptOptions);

        // Record stats
        recordAdaptationStats({
            operation: 'dimension_adaptation',
            sourceModel: sourceModel,
            targetModel: targetModel,
            sourceDimension: a.length,
            targetDimension: b.length,
            strategy: adaptOptions.strategy
        });

        return standardCosineSimilarity(adaptedA, b);
    }
}

/**
 * Normalizes a vector to unit length
 * @param vector The vector to normalize
 * @returns A new normalized vector
 */
export function normalizeVector(vector: Float32Array): Float32Array {
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
        magnitude += vector[i] * vector[i];
    }

    magnitude = Math.sqrt(magnitude);

    // If vector is already normalized or is a zero vector, return a copy
    if (magnitude === 0 || Math.abs(magnitude - 1.0) < 1e-6) {
        return new Float32Array(vector);
    }

    // Create a new normalized vector
    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
        normalized[i] = vector[i] / magnitude;
    }

    return normalized;
}

/**
 * Standard cosine similarity for same-dimension vectors
 */
function standardCosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let aMagnitude = 0;
    let bMagnitude = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        aMagnitude += a[i] * a[i];
        bMagnitude += b[i] * b[i];
    }

    aMagnitude = Math.sqrt(aMagnitude);
    bMagnitude = Math.sqrt(bMagnitude);

    if (aMagnitude === 0 || bMagnitude === 0) {
        return 0;
    }

    return dotProduct / (aMagnitude * bMagnitude);
}

/**
 * Identifies the optimal embedding when multiple are available
 * Prioritizes higher-dimensional embeddings as they contain more information
 */
export function selectOptimalEmbedding(embeddings: Array<{
    providerId: string;
    modelId: string;
    dimension: number;
    count?: number;
}>): {providerId: string; modelId: string; dimension: number} | null {
    if (!embeddings || embeddings.length === 0) return null;

    // First prioritize by dimension (higher is better)
    let optimal = embeddings.reduce((best, current) =>
        current.dimension > best.dimension ? current : best,
        embeddings[0]
    );

    return optimal;
}

/**
 * Padding strategy options for dimension adaptation
 */
export enum PaddingStrategy {
    ZERO = 'zero',               // Simple zero padding (default)
    MEAN = 'mean',               // Padding with mean value of source embedding
    GAUSSIAN = 'gaussian',       // Padding with Gaussian noise based on source statistics
    MIRROR = 'mirror'            // Mirroring existing values for padding
}

/**
 * Configuration for embedding adaptation
 */
export interface AdaptationOptions {
    strategy: PaddingStrategy;
    seed?: number;               // Seed for random number generation (gaussian)
    variance?: number;           // Variance for gaussian noise (default: 0.01)
    normalize?: boolean;         // Whether to normalize after adaptation
}

/**
 * Adapts an embedding to match target dimensions with configurable strategies
 *
 * @param sourceEmbedding The original embedding
 * @param targetDimension The desired dimension
 * @param options Configuration options for the adaptation
 * @returns A new embedding with the target dimensions
 */
export function adaptEmbeddingDimensions(
    sourceEmbedding: Float32Array,
    targetDimension: number,
    options: AdaptationOptions = { strategy: PaddingStrategy.ZERO, normalize: true }
): Float32Array {
    const sourceDimension = sourceEmbedding.length;

    // If dimensions already match, return a copy of the original
    if (sourceDimension === targetDimension) {
        return new Float32Array(sourceEmbedding);
    }

    // Create a new embedding with target dimensions
    const adaptedEmbedding = new Float32Array(targetDimension);

    if (sourceDimension < targetDimension) {
        // Copy all source values first
        adaptedEmbedding.set(sourceEmbedding);

        // Apply the selected padding strategy
        switch (options.strategy) {
            case PaddingStrategy.ZERO:
                // Zero padding is already done by default
                break;

            case PaddingStrategy.MEAN:
                // Calculate mean of source embedding
                let sum = 0;
                for (let i = 0; i < sourceDimension; i++) {
                    sum += sourceEmbedding[i];
                }
                const mean = sum / sourceDimension;

                // Fill remaining dimensions with mean value
                for (let i = sourceDimension; i < targetDimension; i++) {
                    adaptedEmbedding[i] = mean;
                }
                break;

            case PaddingStrategy.GAUSSIAN:
                // Calculate mean and standard deviation of source embedding
                let meanSum = 0;
                for (let i = 0; i < sourceDimension; i++) {
                    meanSum += sourceEmbedding[i];
                }
                const meanValue = meanSum / sourceDimension;

                let varianceSum = 0;
                for (let i = 0; i < sourceDimension; i++) {
                    varianceSum += Math.pow(sourceEmbedding[i] - meanValue, 2);
                }
                const variance = options.variance ?? Math.min(0.01, varianceSum / sourceDimension);
                const stdDev = Math.sqrt(variance);

                // Fill remaining dimensions with Gaussian noise
                for (let i = sourceDimension; i < targetDimension; i++) {
                    // Box-Muller transform for Gaussian distribution
                    const u1 = Math.random();
                    const u2 = Math.random();
                    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

                    adaptedEmbedding[i] = meanValue + stdDev * z0;
                }
                break;

            case PaddingStrategy.MIRROR:
                // Mirror existing values for padding
                for (let i = sourceDimension; i < targetDimension; i++) {
                    // Cycle through source values in reverse order
                    const mirrorIndex = sourceDimension - 1 - ((i - sourceDimension) % sourceDimension);
                    adaptedEmbedding[i] = sourceEmbedding[mirrorIndex];
                }
                break;

            default:
                // Default to zero padding
                break;
        }
    } else {
        // If source is larger, truncate to target dimension
        for (let i = 0; i < targetDimension; i++) {
            adaptedEmbedding[i] = sourceEmbedding[i];
        }
    }

    // Normalize the adapted embedding if requested
    if (options.normalize) {
        return normalizeVector(adaptedEmbedding);
    }

    return adaptedEmbedding;
}

/**
 * Converts embedding Float32Array to Buffer for storage in SQLite
 */
export function embeddingToBuffer(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer);
}

/**
 * Converts Buffer from SQLite back to Float32Array
 */
export function bufferToEmbedding(buffer: Buffer, dimension: number): Float32Array {
    return new Float32Array(buffer.buffer, buffer.byteOffset, dimension);
}

/**
 * Similarity metric options
 */
export enum SimilarityMetric {
    COSINE = 'cosine',               // Standard cosine similarity
    DOT_PRODUCT = 'dot_product',     // Simple dot product (assumes normalized vectors)
    HYBRID = 'hybrid',               // Dot product + cosine hybrid
    DIM_AWARE = 'dimension_aware',   // Dimension-aware similarity that factors in dimension differences
    ENSEMBLE = 'ensemble'            // Combined score from multiple metrics
}

/**
 * Configuration for similarity calculation
 */
export interface SimilarityOptions {
    metric: SimilarityMetric;
    normalize?: boolean;
    ensembleWeights?: {[key in SimilarityMetric]?: number};
    dimensionPenalty?: number; // Penalty factor for dimension differences (0 to 1)
    sourceModel?: string;      // Source model identifier
    targetModel?: string;      // Target model identifier
    contentType?: ContentType; // Type of content being compared
    performanceProfile?: PerformanceProfile; // Performance requirements
}

/**
 * Computes similarity between two vectors using the specified metric
 * @param a First vector
 * @param b Second vector
 * @param options Similarity calculation options
 */
export function computeSimilarity(
    a: Float32Array,
    b: Float32Array,
    options: SimilarityOptions = { metric: SimilarityMetric.COSINE }
): number {
    // Apply normalization if requested
    const normalize = options.normalize ?? false;

    switch (options.metric) {
        case SimilarityMetric.COSINE:
            return cosineSimilarity(
                a, b, normalize,
                options.sourceModel, options.targetModel,
                options.contentType, options.performanceProfile
            );

        case SimilarityMetric.DOT_PRODUCT:
            // Dot product assumes normalized vectors for proper similarity measurement
            const aNorm = normalize ? normalizeVector(a) : a;
            const bNorm = normalize ? normalizeVector(b) : b;
            return computeDotProduct(aNorm, bNorm, options);

        case SimilarityMetric.HYBRID:
            // Hybrid approach combines dot product with cosine similarity
            // More robust against small perturbations while maintaining angle sensitivity
            return hybridSimilarity(a, b, normalize, options);

        case SimilarityMetric.DIM_AWARE:
            // Dimension-aware similarity that factors in dimension differences
            return dimensionAwareSimilarity(
                a, b, normalize,
                options.dimensionPenalty ?? 0.1,
                options.contentType,
                options.performanceProfile
            );

        case SimilarityMetric.ENSEMBLE:
            // Ensemble scoring combines multiple metrics with weights
            return ensembleSimilarity(a, b, options);

        default:
            // Default to cosine similarity
            return cosineSimilarity(
                a, b, normalize,
                options.sourceModel, options.targetModel,
                options.contentType, options.performanceProfile
            );
    }
}

/**
 * Computes dot product between two vectors
 */
export function computeDotProduct(
    a: Float32Array,
    b: Float32Array,
    options?: Pick<SimilarityOptions, 'contentType' | 'performanceProfile' | 'sourceModel' | 'targetModel'>
): number {
    // Adapt dimensions if needed
    if (a.length !== b.length) {
        // Create context for strategy selection if dimensions don't match
        if (options) {
            const context: StrategySelectionContext = {
                contentType: options.contentType || ContentType.GENERAL_TEXT,
                performanceProfile: options.performanceProfile || PerformanceProfile.BALANCED,
                sourceDimension: a.length,
                targetDimension: b.length,
                sourceModel: options.sourceModel,
                targetModel: options.targetModel,
                isCrossModelComparison: options.sourceModel !== options.targetModel &&
                                      options.sourceModel !== undefined &&
                                      options.targetModel !== undefined
            };

            if (a.length > b.length) {
                const adaptOptions = selectOptimalPaddingStrategy(context);
                b = adaptEmbeddingDimensions(b, a.length, adaptOptions);
            } else {
                const adaptOptions = selectOptimalPaddingStrategy(context);
                a = adaptEmbeddingDimensions(a, b.length, adaptOptions);
            }
        } else {
            // Default behavior without options
            if (a.length > b.length) {
                b = adaptEmbeddingDimensions(b, a.length);
            } else {
                a = adaptEmbeddingDimensions(a, b.length);
            }
        }
    }

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
    }

    return dotProduct;
}

/**
 * Hybrid similarity combines dot product and cosine similarity
 * Provides robustness against small perturbations while maintaining angle sensitivity
 */
export function hybridSimilarity(
    a: Float32Array,
    b: Float32Array,
    normalize: boolean = false,
    options?: Pick<SimilarityOptions, 'contentType' | 'performanceProfile' | 'sourceModel' | 'targetModel'>
): number {
    // Get cosine similarity with full options
    const cosine = cosineSimilarity(
        a, b, normalize,
        options?.sourceModel, options?.targetModel,
        options?.contentType, options?.performanceProfile
    );

    // For dot product, we should always normalize
    const aNorm = normalize ? a : normalizeVector(a);
    const bNorm = normalize ? b : normalizeVector(b);

    // If dimensions don't match, adapt with optimal strategy
    let adaptedA = aNorm;
    let adaptedB = bNorm;

    if (aNorm.length !== bNorm.length) {
        // Use optimal padding strategy
        if (options) {
            const context: StrategySelectionContext = {
                contentType: options.contentType || ContentType.GENERAL_TEXT,
                performanceProfile: options.performanceProfile || PerformanceProfile.BALANCED,
                sourceDimension: aNorm.length,
                targetDimension: bNorm.length,
                sourceModel: options.sourceModel,
                targetModel: options.targetModel,
                isCrossModelComparison: options.sourceModel !== options.targetModel &&
                                      options.sourceModel !== undefined &&
                                      options.targetModel !== undefined
            };

            if (aNorm.length < bNorm.length) {
                const adaptOptions = selectOptimalPaddingStrategy(context);
                adaptedA = adaptEmbeddingDimensions(aNorm, bNorm.length, adaptOptions);
            } else {
                const adaptOptions = selectOptimalPaddingStrategy(context);
                adaptedB = adaptEmbeddingDimensions(bNorm, aNorm.length, adaptOptions);
            }
        } else {
            // Default behavior
            adaptedA = aNorm.length < bNorm.length ? adaptEmbeddingDimensions(aNorm, bNorm.length) : aNorm;
            adaptedB = bNorm.length < aNorm.length ? adaptEmbeddingDimensions(bNorm, aNorm.length) : bNorm;
        }
    }

    // Compute dot product (should be similar to cosine for normalized vectors)
    const dot = computeDotProduct(adaptedA, adaptedB, options);

    // Return weighted average - giving more weight to cosine
    return 0.7 * cosine + 0.3 * dot;
}

/**
 * Dimension-aware similarity that factors in dimension differences
 * @param dimensionPenalty Penalty factor for dimension differences (0 to 1)
 */
export function dimensionAwareSimilarity(
    a: Float32Array,
    b: Float32Array,
    normalize: boolean = false,
    dimensionPenalty: number = 0.1,
    contentType?: ContentType,
    performanceProfile?: PerformanceProfile
): number {
    // Basic cosine similarity with content type information
    const cosine = cosineSimilarity(a, b, normalize, undefined, undefined, contentType, performanceProfile);

    // If dimensions match, return standard cosine
    if (a.length === b.length) {
        return cosine;
    }

    // Calculate dimension penalty
    // This penalizes vectors with very different dimensions
    const dimRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    const penalty = 1 - dimensionPenalty * (1 - dimRatio);

    // Apply penalty to similarity score
    return cosine * penalty;
}

/**
 * Ensemble similarity combines multiple metrics with weights
 */
export function ensembleSimilarity(
    a: Float32Array,
    b: Float32Array,
    options: SimilarityOptions
): number {
    // Default weights if not provided
    const weights = options.ensembleWeights ?? {
        [SimilarityMetric.COSINE]: SEARCH_CONSTANTS.VECTOR_SEARCH.SIMILARITY_THRESHOLD.COSINE,
        [SimilarityMetric.HYBRID]: SEARCH_CONSTANTS.VECTOR_SEARCH.SIMILARITY_THRESHOLD.HYBRID,
        [SimilarityMetric.DIM_AWARE]: SEARCH_CONSTANTS.VECTOR_SEARCH.SIMILARITY_THRESHOLD.DIM_AWARE
    };

    let totalWeight = 0;
    let weightedSum = 0;

    // Compute each metric and apply weight
    for (const [metricStr, weight] of Object.entries(weights)) {
        const metric = metricStr as SimilarityMetric;
        if (weight && weight > 0) {
            // Skip the ensemble itself to avoid recursion
            if (metric !== SimilarityMetric.ENSEMBLE) {
                const similarity = computeSimilarity(a, b, {
                    metric,
                    normalize: options.normalize
                });

                weightedSum += similarity * weight;
                totalWeight += weight;
            }
        }
    }

    // Normalize by total weight
    return totalWeight > 0 ? weightedSum / totalWeight : cosineSimilarity(a, b, options.normalize);
}

/**
 * Debug configuration for vector operations
 */
export interface DebugConfig {
    enabled: boolean;
    logLevel: 'info' | 'debug' | 'warning' | 'error';
    recordStats: boolean;
}

/**
 * Global debug configuration, can be modified at runtime
 */
export const vectorDebugConfig: DebugConfig = {
    enabled: false,
    logLevel: 'info',
    recordStats: false
};

/**
 * Statistics collected during vector operations
 */
export interface AdaptationStats {
    timestamp: number;
    operation: string;
    sourceModel?: string;
    targetModel?: string;
    sourceDimension: number;
    targetDimension: number;
    strategy: string;
    similarity?: number;
}

// Collection of adaptation statistics for quality auditing
export const adaptationStats: AdaptationStats[] = [];

/**
 * Log a message if debugging is enabled
 */
function debugLog(
    message: string,
    level: 'info' | 'debug' | 'warning' | 'error' = 'info'
): void {
    if (vectorDebugConfig.enabled) {
        const levelOrder = { 'debug': 0, 'info': 1, 'warning': 2, 'error': 3 };

        if (levelOrder[level] >= levelOrder[vectorDebugConfig.logLevel]) {
            const prefix = `[VectorUtils:${level.toUpperCase()}]`;

            switch (level) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warning':
                    console.warn(prefix, message);
                    break;
                case 'debug':
                    console.debug(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }
}

/**
 * Record adaptation statistics if enabled
 */
function recordAdaptationStats(stats: Omit<AdaptationStats, 'timestamp'>): void {
    if (vectorDebugConfig.enabled && vectorDebugConfig.recordStats) {
        adaptationStats.push({
            ...stats,
            timestamp: Date.now()
        });

        // Keep only the last 1000 stats to prevent memory issues
        if (adaptationStats.length > 1000) {
            adaptationStats.shift();
        }
    }
}

/**
 * Content types for embedding adaptation strategy selection
 */
export enum ContentType {
    GENERAL_TEXT = 'general_text',
    CODE = 'code',
    STRUCTURED_DATA = 'structured_data',
    MATHEMATICAL = 'mathematical',
    MIXED = 'mixed'
}

/**
 * Performance profile for selecting adaptation strategy
 */
export enum PerformanceProfile {
    MAXIMUM_QUALITY = 'maximum_quality',   // Prioritize similarity quality over speed
    BALANCED = 'balanced',                 // Balance quality and performance
    MAXIMUM_SPEED = 'maximum_speed'        // Prioritize speed over quality
}

/**
 * Context for selecting the optimal padding strategy
 */
export interface StrategySelectionContext {
    contentType?: ContentType;                 // Type of content being compared
    performanceProfile?: PerformanceProfile;   // Performance requirements
    sourceDimension: number;                   // Source embedding dimension
    targetDimension: number;                   // Target embedding dimension
    sourceModel?: string;                      // Source model identifier
    targetModel?: string;                      // Target model identifier
    isHighPrecisionRequired?: boolean;         // Whether high precision is needed
    isCrossModelComparison?: boolean;          // Whether comparing across different models
    dimensionRatio?: number;                   // Custom dimension ratio threshold
}

/**
 * Selects the optimal padding strategy based on content type and performance considerations
 * @param context Selection context parameters
 * @returns The most appropriate padding strategy and options
 */
export function selectOptimalPaddingStrategy(
    context: StrategySelectionContext
): AdaptationOptions {
    const {
        contentType = ContentType.GENERAL_TEXT,
        performanceProfile = PerformanceProfile.BALANCED,
        sourceDimension,
        targetDimension,
        isHighPrecisionRequired = false,
        isCrossModelComparison = false
    } = context;

    // Calculate dimension ratio
    const dimRatio = Math.min(sourceDimension, targetDimension) /
                     Math.max(sourceDimension, targetDimension);

    // Default options
    const options: AdaptationOptions = {
        strategy: PaddingStrategy.ZERO,
        normalize: true
    };

    // Significant dimension difference detection
    const hasSignificantDimDifference = dimRatio < (context.dimensionRatio || 0.5);

    // Select strategy based on content type
    switch (contentType) {
        case ContentType.CODE:
            // Code benefits from structural patterns
            options.strategy = PaddingStrategy.MIRROR;
            break;

        case ContentType.STRUCTURED_DATA:
            // Structured data works well with mean-value padding
            options.strategy = PaddingStrategy.MEAN;
            break;

        case ContentType.MATHEMATICAL:
            // Mathematical content benefits from gaussian noise to maintain statistical properties
            options.strategy = PaddingStrategy.GAUSSIAN;
            options.variance = 0.005; // Lower variance for mathematical precision
            break;

        case ContentType.MIXED:
            // For mixed content, choose based on performance profile
            if (performanceProfile === PerformanceProfile.MAXIMUM_QUALITY) {
                options.strategy = PaddingStrategy.GAUSSIAN;
            } else if (performanceProfile === PerformanceProfile.MAXIMUM_SPEED) {
                options.strategy = PaddingStrategy.ZERO;
            } else {
                options.strategy = PaddingStrategy.MEAN;
            }
            break;

        case ContentType.GENERAL_TEXT:
        default:
            // For general text, base decision on other factors
            if (isHighPrecisionRequired) {
                options.strategy = PaddingStrategy.GAUSSIAN;
            } else if (isCrossModelComparison) {
                options.strategy = PaddingStrategy.MEAN;
            } else {
                options.strategy = PaddingStrategy.ZERO;
            }
            break;
    }

    // Override based on performance profile if we have significant dimension differences
    if (hasSignificantDimDifference) {
        // For extreme dimension differences, specialized handling
        if (performanceProfile === PerformanceProfile.MAXIMUM_QUALITY) {
            // For quality, use gaussian noise for better statistical matching
            options.strategy = PaddingStrategy.GAUSSIAN;
            // Adjust variance based on dimension ratio
            options.variance = Math.min(0.01, 0.02 * dimRatio);

            // Log the significant dimension adaptation
            debugLog(`Significant dimension difference detected: ${sourceDimension} vs ${targetDimension}. ` +
                     `Ratio: ${dimRatio.toFixed(2)}. Using Gaussian strategy.`, 'warning');
        } else if (performanceProfile === PerformanceProfile.MAXIMUM_SPEED) {
            // For speed, stick with zero padding
            options.strategy = PaddingStrategy.ZERO;
        }
    }

    // Always use zero padding for trivial dimension differences
    // (e.g. 1536 vs 1537) for performance reasons
    if (Math.abs(sourceDimension - targetDimension) <= 5) {
        options.strategy = PaddingStrategy.ZERO;
    }

    // Log the selected strategy
    debugLog(`Selected padding strategy: ${options.strategy} for ` +
             `content type: ${contentType}, performance profile: ${performanceProfile}`, 'debug');

    return options;
}

/**
 * Helper function to determine content type from note context
 * @param context The note context information
 * @returns The detected content type
 */
export function detectContentType(mime: string, content?: string): ContentType {
    // Detect based on mime type
    if (mime.includes('code') ||
        mime.includes('javascript') ||
        mime.includes('typescript') ||
        mime.includes('python') ||
        mime.includes('java') ||
        mime.includes('c++') ||
        mime.includes('json')) {
        return ContentType.CODE;
    }

    if (mime.includes('xml') ||
        mime.includes('csv') ||
        mime.includes('sql') ||
        mime.endsWith('+json')) {
        return ContentType.STRUCTURED_DATA;
    }

    if (mime.includes('latex') ||
        mime.includes('mathml') ||
        mime.includes('tex')) {
        return ContentType.MATHEMATICAL;
    }

    // If we have content, we can do deeper analysis
    if (content) {
        // Detect code by looking for common patterns
        const codePatterns = [
            /function\s+\w+\s*\(.*\)\s*{/,  // JavaScript/TypeScript function
            /def\s+\w+\s*\(.*\):/,          // Python function
            /class\s+\w+(\s+extends\s+\w+)?(\s+implements\s+\w+)?\s*{/, // Java/TypeScript class
            /import\s+.*\s+from\s+['"]/,    // JS/TS import
            /^\s*```\w+/m                    // Markdown code block
        ];

        if (codePatterns.some(pattern => pattern.test(content))) {
            return ContentType.CODE;
        }

        // Detect structured data
        const structuredPatterns = [
            /^\s*[{\[]/,                     // JSON-like start
            /^\s*<\?xml/,                    // XML declaration
            /^\s*<[a-z]+>/i,                 // HTML/XML tag
            /^\s*(\w+,)+\w+$/m,              // CSV-like
            /CREATE\s+TABLE|SELECT\s+.*\s+FROM/i  // SQL
        ];

        if (structuredPatterns.some(pattern => pattern.test(content))) {
            return ContentType.STRUCTURED_DATA;
        }

        // Detect mathematical content
        const mathPatterns = [
            /\$\$.*\$\$/s,                   // LaTeX block
            /\\begin{equation}/,             // LaTeX equation environment
            /\\sum|\\int|\\frac|\\sqrt/,     // Common LaTeX math commands
        ];

        if (mathPatterns.some(pattern => pattern.test(content))) {
            return ContentType.MATHEMATICAL;
        }

        // Check for mixed content
        const hasMixedContent =
            (codePatterns.some(pattern => pattern.test(content)) &&
             content.split(/\s+/).length > 100) || // Code and substantial text
            (content.includes('```') &&
             content.replace(/```.*?```/gs, '').length > 200); // Markdown with code blocks and text

        if (hasMixedContent) {
            return ContentType.MIXED;
        }
    }

    // Default to general text
    return ContentType.GENERAL_TEXT;
}
