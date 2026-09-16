"use strict";

// =========================================================
// SHARED NATURAL-LANGUAGE PRODUCT QUERY PARSER
// =========================================================
// Pure rule-based (no AI call) so results are deterministic
// and can never "invent" a category/price that wasn't there.
// Used by: AI Product Finder (aiController.js)
// Reused pattern from: chatController.js relevance scoring
//
// TYPO TOLERANCE (added):
// Category keyword matching now tolerates small misspellings
// ("sheos" -> "shoes", "electronis" -> "electronics") using a
// lightweight Levenshtein-distance check. No external library,
// no AI call — still fully deterministic. A small edit-distance
// threshold scales with word length so short words stay strict
// (avoids false positives like "man" matching unrelated words).
// =========================================================

const CATEGORY_KEYWORDS = {
    men: ["men", "man", "mens", "male", "boy"],
    women: ["women", "woman", "womens", "female", "lady", "ladies"],
    kids: ["kids", "kid", "children", "child", "baby"],
    accessories: ["accessories", "accessory", "belt", "watch", "bag", "wallet"],
    electronics: [
        "electronics", "electronic", "phone", "mobile", "headphone",
        "headphones", "earphone", "laptop", "computer", "gadget"
    ]
};

const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "i", "me", "my", "want", "need",
    "looking", "for", "find", "show", "please", "can", "you", "give",
    "some", "product", "products", "under", "below", "less", "than",
    "with", "and", "or", "in", "on", "of", "to", "from", "around",
    "about", "over", "above", "more"
]);

// ---------------------------------------------------------
// Levenshtein distance (edit distance between two strings)
// Classic dynamic-programming implementation, O(m*n).
// Query text is short (a few words), so this stays cheap.
// ---------------------------------------------------------

const levenshteinDistance = (a, b) => {

    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const rows = a.length + 1;
    const cols = b.length + 1;

    const matrix = Array.from(
        { length: rows },
        (_, i) => {
            const row = new Array(cols).fill(0);
            row[0] = i;
            return row;
        }
    );

    for (let j = 0; j < cols; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {

            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[rows - 1][cols - 1];
};

// ---------------------------------------------------------
// Max allowed typo distance for a given word length.
// Short words (<=3 chars) must match exactly to avoid
// accidental collisions ("boy" vs "buy"). Longer words
// tolerate 1-2 character typos.
// ---------------------------------------------------------

const maxAllowedDistance = (wordLength) => {

    if (wordLength <= 3) return 0;
    if (wordLength <= 6) return 1;

    return 2;
};

// ---------------------------------------------------------
// Fuzzy match: does `word` approximately match `target`?
// Exported so other files (e.g. product name search) can
// reuse the same tolerant matching logic.
// ---------------------------------------------------------

const fuzzyMatches = (word, target) => {

    if (!word || !target) return false;

    if (word === target) return true;

    // Quick reject: length too different to ever be a typo match
    if (Math.abs(word.length - target.length) > 2) return false;

    const distance = levenshteinDistance(word, target);

    return distance <= maxAllowedDistance(target.length);
};

// ---------------------------------------------------------
// Detect category (now typo-tolerant)
// ---------------------------------------------------------

const detectCategory = (text) => {

    const words = text
        .split(/\s+/)
        .filter(Boolean);

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {

        for (const keyword of keywords) {

            // Exact substring match (fast path, unchanged behavior)
            if (text.includes(keyword)) {
                return category;
            }

            // Typo-tolerant fallback: compare each query word
            // against this keyword
            const hasFuzzyMatch = words.some(
                (word) => fuzzyMatches(word, keyword)
            );

            if (hasFuzzyMatch) {
                return category;
            }
        }
    }

    return null;
};

// ---------------------------------------------------------
// Detect price constraints
// Handles: "under $100", "below 80", "less than $50",
// "cheaper than 100", "over $50", "above 100", "more than 20",
// "around $200", "$50 to $100", "$50-$100"
// ---------------------------------------------------------

const detectPrice = (text) => {

    let priceMin = null;
    let priceMax = null;

    const rangeMatch = text.match(
        /\$?(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?(\d+(?:\.\d+)?)/
    );

    if (rangeMatch) {

        priceMin = parseFloat(rangeMatch[1]);
        priceMax = parseFloat(rangeMatch[2]);

        return { priceMin, priceMax };
    }

    const maxMatch = text.match(
        /(?:under|below|less than|cheaper than)\s*\$?(\d+(?:\.\d+)?)/
    );

    if (maxMatch) {
        priceMax = parseFloat(maxMatch[1]);
        return { priceMin, priceMax };
    }

    const minMatch = text.match(
        /(?:over|above|more than)\s*\$?(\d+(?:\.\d+)?)/
    );

    if (minMatch) {
        priceMin = parseFloat(minMatch[1]);
        return { priceMin, priceMax };
    }

    const approxMatch = text.match(
        /around\s*\$?(\d+(?:\.\d+)?)/
    );

    if (approxMatch) {

        const value = parseFloat(approxMatch[1]);

        priceMin = value * 0.75;
        priceMax = value * 1.25;

        return { priceMin, priceMax };
    }

    return { priceMin, priceMax };
};

// ---------------------------------------------------------
// Extract leftover keywords (product type, color, etc.)
// ---------------------------------------------------------

const extractKeywords = (text) => {

    return text
        .replace(/[^\w\s$.-]/g, " ")
        .replace(/\$?\d+(?:\.\d+)?/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
};

// ---------------------------------------------------------
// Main entry point
// ---------------------------------------------------------

const parseProductQuery = (rawQuery) => {

    const text = (rawQuery || "").toLowerCase().trim();

    const category = detectCategory(text);
    const { priceMin, priceMax } = detectPrice(text);
    const keywords = extractKeywords(text);

    return {
        category,
        priceMin,
        priceMax,
        keywords
    };
};

module.exports = {
    parseProductQuery,
    detectCategory,
    detectPrice,
    extractKeywords,
    fuzzyMatches,
    levenshteinDistance
};