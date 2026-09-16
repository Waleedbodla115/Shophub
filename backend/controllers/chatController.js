"use strict";

const Product = require("../models/Product");

/* =========================================================
   GROQ CONFIGURATION
========================================================= */

const GROQ_URL =
    process.env.GROQ_URL ||
    "https://api.groq.com/openai/v1/chat/completions";

const GROQ_API_KEY =
    process.env.GROQ_API_KEY || "";

const GROQ_MODEL =
    process.env.GROQ_MODEL ||
    "llama-3.1-8b-instant";

const GROQ_TIMEOUT =
    Number(process.env.GROQ_TIMEOUT) || 30000;

const CATALOG_CACHE_DURATION = 60 * 1000;

let catalogCache = [];
let catalogCacheTime = 0;

/* =========================================================
   SHOPPY SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT_BASE = `
You are "Shoppy", the AI shopping assistant for ShopHub.

ShopHub sells:
- men's products
- women's products
- kids' products
- accessories
- electronics

Your job:

1. Help customers discover products.
2. Recommend products only from the provided ShopHub catalog.
3. Compare actual catalog products.
4. Answer questions about price, rating, category and stock.
5. Help customers choose products.
6. Keep responses friendly, concise and useful.

STRICT PRODUCT RULES:

- ONLY recommend products included in the provided catalog.
- NEVER invent products.
- NEVER invent prices.
- NEVER invent stock.
- NEVER invent ratings.
- NEVER invent specifications.
- NEVER recommend products with stock 0.
- Prices are in USD.
- Valid categories are: men, women, kids, accessories, electronics.
- If no matching product exists, honestly say so.

STYLE:

- Friendly.
- Professional.
- Concise.
- Normally 2-4 sentences.
- For comparisons, use short bullet points.
- If asked "which is best", briefly explain why.

IMPORTANT:

If the customer is only greeting you or making casual conversation,
DO NOT list or recommend products unless they ask for products.

If the request is unrelated to shopping, politely redirect the customer
to ShopHub.
`;

/* =========================================================
   LOAD PRODUCT CATALOG
========================================================= */

async function loadCatalog() {
    const now = Date.now();

    if (
        catalogCache.length > 0 &&
        now - catalogCacheTime < CATALOG_CACHE_DURATION
    ) {
        return catalogCache;
    }

    const products = await Product.find()
        .select("_id name description category price stock rating image")
        .limit(500)
        .lean();

    catalogCache = products;
    catalogCacheTime = now;

    return products;
}

/* =========================================================
   PRICE EXTRACTION
========================================================= */

function extractMaxPrice(text) {
    const match = text.match(
        /(?:under|below|less than|up to|maximum|max|within)\s*\$?\s*(\d+(?:\.\d+)?)/i
    );

    return match ? Number(match[1]) : null;
}

function extractMinPrice(text) {
    const match = text.match(
        /(?:above|over|more than|starting from|at least|minimum|min)\s*\$?\s*(\d+(?:\.\d+)?)/i
    );

    return match ? Number(match[1]) : null;
}

function extractPriceRange(text) {
    const match = text.match(
        /\$?\s*(\d+(?:\.\d+)?)\s*(?:to|-)\s*\$?\s*(\d+(?:\.\d+)?)/i
    );

    if (!match) {
        return null;
    }

    return {
        min: Number(match[1]),
        max: Number(match[2])
    };
}

/* =========================================================
   CATEGORY DETECTION
========================================================= */

function detectCategory(text) {
    const categoryKeywords = {
        men: [
            "men",
            "mens",
            "man's",
            "man",
            "male",
            "gentlemen"
        ],

        women: [
            "women",
            "womens",
            "woman",
            "female",
            "lady",
            "ladies"
        ],

        kids: [
            "kids",
            "kid",
            "children",
            "child"
        ],

        accessories: [
            "accessories",
            "accessory",
            "belt",
            "watch",
            "bag",
            "bags",
            "wallet",
            "handbag",
            "handbags"
        ],

        electronics: [
            "electronics",
            "electronic",
            "phone",
            "mobile",
            "headphone",
            "headphones",
            "earphone",
            "earphones",
            "laptop",
            "computer",
            "gadget",
            "gadgets",
            "tech"
        ]
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            const escapedKeyword = keyword.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const regex = new RegExp(
                `\\b${escapedKeyword}\\b`,
                "i"
            );

            if (regex.test(text)) {
                return category;
            }
        }
    }

    return null;
}

/* =========================================================
   SEARCH WORDS
========================================================= */

function extractSearchWords(text) {
    const stopWords = new Set([
        "the",
        "a",
        "an",
        "is",
        "are",
        "i",
        "me",
        "my",
        "want",
        "need",
        "looking",
        "look",
        "for",
        "find",
        "show",
        "please",
        "can",
        "you",
        "give",
        "some",
        "product",
        "products",
        "under",
        "below",
        "less",
        "than",
        "with",
        "and",
        "or",
        "in",
        "on",
        "of",
        "to",
        "from",
        "best",
        "good",
        "great",
        "cheap",
        "cheapest",
        "available",
        "something",
        "would",
        "like",
        "more",
        "showing",
        "get",
        "have",
        "got",
        "do",
        "does",
        "which",
        "one",
        "ones",
        "choose",
        "choice"
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s$.-]/g, " ")
        .split(/\s+/)
        .filter((word) => {
            if (word.length < 3) {
                return false;
            }

            if (stopWords.has(word)) {
                return false;
            }

            if (/^\d+(?:\.\d+)?$/.test(word)) {
                return false;
            }

            return true;
        });
}

/* =========================================================
   SORT INTENT
========================================================= */

function detectSortIntent(text) {
    const lower = text.toLowerCase();

    if (
        lower.includes("cheapest") ||
        lower.includes("lowest price") ||
        lower.includes("least expensive") ||
        lower.includes("most affordable")
    ) {
        return "price_asc";
    }

    if (
        lower.includes("most expensive") ||
        lower.includes("highest price") ||
        lower.includes("expensive")
    ) {
        return "price_desc";
    }

    if (
        lower.includes("best rated") ||
        lower.includes("highest rated") ||
        lower.includes("best rating") ||
        lower.includes("top rated")
    ) {
        return "rating_desc";
    }

    return null;
}

/* =========================================================
   PRODUCT / SHOPPING INTENT
========================================================= */

function hasProductIntent(text) {
    const lower = text.toLowerCase().trim();

    const category = detectCategory(lower);
    const maxPrice = extractMaxPrice(lower);
    const minPrice = extractMinPrice(lower);
    const priceRange = extractPriceRange(lower);
    const sortIntent = detectSortIntent(lower);

    if (
        category ||
        maxPrice !== null ||
        minPrice !== null ||
        priceRange ||
        sortIntent
    ) {
        return true;
    }

    const productWords = [
        "product",
        "products",
        "shop",
        "shopping",
        "buy",
        "purchase",
        "looking for",
        "recommend",
        "recommendation",
        "show me",
        "find me",
        "i need",
        "i want",
        "available",
        "catalog",
        "collection",
        "shoes",
        "shoe",
        "dress",
        "jacket",
        "shirt",
        "watch",
        "bag",
        "handbag",
        "belt",
        "wallet",
        "headphone",
        "headphones",
        "earphone",
        "laptop",
        "phone",
        "mobile",
        "gadget"
    ];

    return productWords.some((word) =>
        lower.includes(word)
    );
}

/* =========================================================
   CASUAL / GREETING INTENT
========================================================= */

function isCasualMessage(text) {
    const lower = text
        .toLowerCase()
        .trim()
        .replace(/[!?.,]+$/g, "");

    const casualMessages = [
        "hi",
        "hello",
        "hey",
        "hy",
        "hii",
        "hiii",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "how r you",
        "thanks",
        "thank you",
        "thankyou",
        "ok",
        "okay",
        "nice",
        "great",
        "cool",
        "bye",
        "goodbye"
    ];

    return casualMessages.includes(lower);
}

/* =========================================================
   FOLLOW-UP INTENT
========================================================= */

function isProductFollowUp(text) {
    const lower = text.toLowerCase();

    return (
        lower.includes("which is best") ||
        lower.includes("which one is best") ||
        lower.includes("best one") ||
        lower.includes("which should i choose") ||
        lower.includes("which should i buy") ||
        lower.includes("compare these") ||
        lower.includes("compare them") ||
        lower.includes("which one") ||
        lower.includes("among these") ||
        lower.includes("among them")
    );
}

/* =========================================================
   FIND RELEVANT PRODUCTS
========================================================= */

function findRelevantProducts(products, userMessage) {
    const text = userMessage.toLowerCase().trim();

    const category = detectCategory(text);
    const maxPrice = extractMaxPrice(text);
    const minPrice = extractMinPrice(text);
    const priceRange = extractPriceRange(text);
    const sortIntent = detectSortIntent(text);
    const searchWords = extractSearchWords(text);

    let filteredProducts = products.filter(
        (product) =>
            Number(product.stock || 0) > 0
    );

    /* CATEGORY */

    if (category) {
        filteredProducts = filteredProducts.filter(
            (product) =>
                String(product.category || "").toLowerCase() ===
                category
        );
    }

    /* MAX PRICE */

    if (maxPrice !== null) {
        filteredProducts = filteredProducts.filter(
            (product) =>
                Number(product.price || 0) <= maxPrice
        );
    }

    /* MIN PRICE */

    if (minPrice !== null) {
        filteredProducts = filteredProducts.filter(
            (product) =>
                Number(product.price || 0) >= minPrice
        );
    }

    /* PRICE RANGE */

    if (priceRange) {
        filteredProducts = filteredProducts.filter(
            (product) => {
                const price = Number(product.price || 0);

                return (
                    price >= priceRange.min &&
                    price <= priceRange.max
                );
            }
        );
    }

    /* SCORE */

    const scoredProducts = filteredProducts.map((product) => {
        const productName =
            String(product.name || "").toLowerCase();

        const productDescription =
            String(product.description || "").toLowerCase();

        const productCategory =
            String(product.category || "").toLowerCase();

        let score = 0;

        if (
            category &&
            productCategory === category
        ) {
            score += 20;
        }

        for (const word of searchWords) {
            if (productName.includes(word)) {
                score += 10;
            }

            if (productDescription.includes(word)) {
                score += 4;
            }

            if (productCategory.includes(word)) {
                score += 4;
            }
        }

        if (sortIntent === "rating_desc") {
            score += Number(product.rating || 0) * 2;
        }

        return {
            product,
            score
        };
    });

    /* SORT */

    if (sortIntent === "price_asc") {
        scoredProducts.sort(
            (a, b) =>
                Number(a.product.price || 0) -
                Number(b.product.price || 0)
        );
    } else if (sortIntent === "price_desc") {
        scoredProducts.sort(
            (a, b) =>
                Number(b.product.price || 0) -
                Number(a.product.price || 0)
        );
    } else if (sortIntent === "rating_desc") {
        scoredProducts.sort(
            (a, b) =>
                Number(b.product.rating || 0) -
                Number(a.product.rating || 0)
        );
    } else {
        scoredProducts.sort(
            (a, b) => b.score - a.score
        );
    }

    /*
     * If the customer explicitly asked for
     * a category/price/product, only return
     * genuinely matching products.
     */

    const explicitFilter =
        Boolean(category) ||
        maxPrice !== null ||
        minPrice !== null ||
        Boolean(priceRange) ||
        Boolean(sortIntent) ||
        searchWords.length > 0;

    if (!explicitFilter) {
        return [];
    }

    return scoredProducts
        .filter((item) => {
            if (
                category ||
                maxPrice !== null ||
                minPrice !== null ||
                priceRange ||
                sortIntent
            ) {
                return true;
            }

            return item.score > 0;
        })
        .slice(0, 8)
        .map((item) => item.product);
}

/* =========================================================
   BUILD CATALOG SNAPSHOT
========================================================= */

function buildCatalogSnapshot(products) {
    if (!products.length) {
        return `
MATCHING SHOPHUB CATALOG:

No matching products are currently available.
`;
    }

    const lines = products.map(
        (product) => `
PRODUCT_ID: ${product._id}
NAME: ${product.name}
CATEGORY: ${product.category}
PRICE: $${Number(product.price || 0).toFixed(2)}
STOCK: ${Number(product.stock || 0)}
RATING: ${Number(product.rating || 0).toFixed(1)}/5
DESCRIPTION: ${product.description || "Not provided"}
`
    );

    return `
MATCHING SHOPHUB CATALOG:

${lines.join("\n")}
`;
}

/* =========================================================
   PRODUCT RESPONSE DATA
========================================================= */

function buildProductResults(products) {
    return products.map((product) => ({
        id: String(product._id),
        _id: String(product._id),
        name: product.name,
        description: product.description || "",
        category: product.category,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
        rating: Number(product.rating || 0),
        image: product.image || ""
    }));
}

/* =========================================================
   GROQ REQUEST
========================================================= */

async function askOllama(messages, stream = false) {
    try {
        if (!GROQ_API_KEY) {
            console.error(
                "❌ GROQ_API_KEY is missing in .env"
            );

            return {
                ok: false,
                status: 0,
                body: null,
                text: async () => "GROQ_API_KEY is missing"
            };
        }

        console.log("🤖 Sending request to Groq...");
        console.log("🧠 Groq Model:", GROQ_MODEL);
        console.log("⏱️ Groq Timeout:", GROQ_TIMEOUT);

        const response = await fetch(
            GROQ_URL,
            {
                method: "POST",

                signal: AbortSignal.timeout(
                    GROQ_TIMEOUT
                ),

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },

                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages,
                    stream: false,
                    temperature: 0.35,
                    max_tokens: 300
                })
            }
        );

        console.log(
            "✅ Groq HTTP Status:",
            response.status
        );

        if (!response.ok) {
            const errText = await response
                .text()
                .catch(() => "");

            console.error(
                "❌ Groq Error Body:",
                errText
            );

            return {
                ok: false,
                status: response.status,
                body: null,
                text: async () => errText
            };
        }

        const data = await response.json();

        /*
         * Normalize Groq's OpenAI-style response
         * (choices[0].message.content) into the
         * same shape the rest of this file already
         * expects (data.message.content), so nothing
         * below this function needs to change.
         */

        return {
            ok: true,
            status: response.status,
            json: async () => ({
                message: {
                    content:
                        data?.choices?.[0]?.message?.content ||
                        ""
                }
            }),
            text: async () => JSON.stringify(data)
        };
    } catch (error) {
        console.error(
            "❌ Groq connection failed:",
            error.message
        );

        return {
            ok: false,
            status: 0,
            body: null,
            text: async () => error.message
        };
    }
}

/* =========================================================
   LOCAL FALLBACK RESPONSE
========================================================= */

function buildLocalReply(casual, productResults) {
    if (
        casual &&
        productResults.length === 0
    ) {
        return "Hi! I'm Shoppy, your ShopHub shopping assistant. Tell me what you are looking for — for example men's shoes, headphones, or a gift under $50.";
    }

    if (!productResults.length) {
        return "I could not find matching products in the ShopHub catalog for that. Try another category like men, women, kids, accessories, or electronics.";
    }

    const lines = productResults
        .slice(0, 4)
        .map((product, index) => {
            const rating = product.rating
                ? ` (${Number(product.rating).toFixed(1)}★)`
                : "";

            return `${index + 1}. ${product.name} — $${Number(
                product.price || 0
            ).toFixed(2)}${rating}`;
        });

    return `Here are some ShopHub picks for you:

${lines.join("\n")}

Want a cheaper option, a different category, or help comparing these?`;
}

/* =========================================================
   SEND LOCAL CHAT RESPONSE
========================================================= */

function sendLocalChatResponse(
    res,
    stream,
    reply,
    productResults
) {
    if (stream === true) {
        res.writeHead(200, {
            "Content-Type":
                "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
            "X-AI-Products":
                JSON.stringify(productResults)
        });

        res.write(reply);

        return res.end();
    }

    return res.status(200).json({
        success: true,
        reply,
        products: productResults
    });
}

/* =========================================================
   SEND MESSAGE
========================================================= */

const sendMessage = async (req, res) => {
    try {
        /*
         * req.body may be undefined if a malformed
         * request reaches the controller.
         */

        const {
            message,
            history,
            stream
        } = req.body || {};

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const userMessage = message.trim();

        /* =================================================
           LOAD PRODUCTS
        ================================================= */

        const allProducts = await loadCatalog();

        /* =================================================
           SAFE HISTORY
        ================================================= */

        const safeHistory =
            Array.isArray(history)
                ? history
                      .filter(
                          (item) =>
                              item &&
                              (
                                  item.role === "user" ||
                                  item.role === "assistant"
                              ) &&
                              typeof item.content === "string" &&
                              item.content.trim()
                      )
                      .slice(-8)
                : [];

        /* =================================================
           DETERMINE INTENT
        ================================================= */

        const casual =
            isCasualMessage(userMessage);

        const productRequest =
            hasProductIntent(userMessage);

        const followUp =
            isProductFollowUp(userMessage);

        /* =================================================
           FOLLOW-UP REQUEST
        ================================================= */

        let searchMessage = userMessage;

        if (
            followUp &&
            safeHistory.length > 0
        ) {
            const previousUserMessages =
                safeHistory.filter(
                    (item) =>
                        item.role === "user"
                );

            const previousUserMessage =
                previousUserMessages[
                    previousUserMessages.length - 1
                ]?.content;

            if (previousUserMessage) {
                searchMessage =
                    previousUserMessage;
            }
        }

        /* =================================================
           SEARCH CATALOG
        ================================================= */

        let relevantProducts = [];

        if (
            !casual &&
            (productRequest || followUp)
        ) {
            relevantProducts =
                findRelevantProducts(
                    allProducts,
                    searchMessage
                );
        }

        /* =================================================
           CATALOG SNAPSHOT
        ================================================= */

        const catalogSnapshot =
            buildCatalogSnapshot(
                relevantProducts
            );

        /* =================================================
           PRODUCT RESULTS
        ================================================= */

        const productResults =
            buildProductResults(
                relevantProducts
            );

        /* =================================================
           SYSTEM PROMPT
        ================================================= */

        const systemPrompt = `
${SYSTEM_PROMPT_BASE}

${catalogSnapshot}

IMPORTANT RESPONSE RULES:

1. If the user is only greeting you,
   do not recommend products.

2. If there are no matching products,
   clearly say that no matching products
   are currently available.

3. Never invent a product.

4. Never invent a price, rating or stock.

5. Use exact product names from the catalog.

6. Use exact prices from the catalog.

7. Only recommend products that appear
   in MATCHING SHOPHUB CATALOG.

8. For "which is best?" questions,
   compare the matching products using
   their actual rating, price, stock and
   available description.

9. Keep the answer concise.
`;

        /* =================================================
           MESSAGES
        ================================================= */

        const messages = [
            {
                role: "system",
                content: systemPrompt
            },

            ...safeHistory,

            {
                role: "user",
                content: userMessage
            }
        ];

        /* =================================================
           STREAMING RESPONSE
        ================================================= */

        if (stream === true) {
            /*
             * We intentionally use a normal Ollama response
             * here and send the completed answer to frontend.
             */

            const ollamaResponse =
                await askOllama(
                    messages,
                    false
                );

            if (!ollamaResponse.ok) {
                return sendLocalChatResponse(
                    res,
                    true,
                    buildLocalReply(
                        casual,
                        productResults
                    ),
                    productResults
                );
            }

            const streamData =
                await ollamaResponse.json();

            const streamReply =
                streamData?.message?.content?.trim() ||
                buildLocalReply(
                    casual,
                    productResults
                );

            return sendLocalChatResponse(
                res,
                true,
                streamReply,
                productResults
            );
        }

        /* =================================================
           NORMAL RESPONSE
        ================================================= */

        const ollamaResponse =
            await askOllama(
                messages,
                false
            );

        if (!ollamaResponse.ok) {
            const errorText =
                await ollamaResponse
                    .text()
                    .catch(() => "");

            console.error(
                "❌ Ollama Error:",
                ollamaResponse.status,
                errorText
            );

            return sendLocalChatResponse(
                res,
                false,
                buildLocalReply(
                    casual,
                    productResults
                ),
                productResults
            );
        }

        /* =================================================
           PARSE OLLAMA RESPONSE
        ================================================= */

        const data =
            await ollamaResponse.json();

        const reply =
            data?.message?.content?.trim() ||
            "Sorry, I couldn't find a suitable response.";

        return res.status(200).json({
            success: true,
            reply,
            products: productResults
        });

    } catch (error) {
        console.error(
            "❌ Chat Controller Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to process chat message",
            error:
                error.message
        });
    }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
    sendMessage
};