import {
    AIMessage,
    HumanMessage,
    SystemMessage
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

/**
 * OpenAI chat service powered by LangChain's ChatOpenAI integration.
 *
 * Env:
 * - OPENAI_API_KEY
 * - OPENAI_MODEL (optional, defaults to GPT-5.1)
 * - OPENAI_TITLE_MODEL (optional, defaults to GPT-5 mini)
 */

const PROVIDER = "openai";
const MODEL_REGISTRY = Object.freeze([
    {
        alias: "gpt-5.1",
        id: "gpt-5.1",
        label: "GPT-5.1",
        apiKeyEnvVar: "OPENAI_API_KEY",
        defaults: { maxTokens: 1800 }
    },
    {
        alias: "gpt-5-mini",
        id: "gpt-5-mini",
        label: "GPT-5 mini",
        apiKeyEnvVar: "OPENAI_API_KEY",
        defaults: { maxTokens: 1400 }
    },
    {
        alias: "gpt-4.1",
        id: "gpt-4.1",
        label: "GPT-4.1",
        apiKeyEnvVar: "OPENAI_API_KEY",
        defaults: { temperature: 0.6, maxTokens: 1400 }
    }
]);
const DEFAULT_MODEL_ENV_VAR = "OPENAI_MODEL";
const TITLE_MODEL_ENV_VAR = "OPENAI_TITLE_MODEL";
const DEFAULT_MODEL_ID = "gpt-5.1";
const DEFAULT_TITLE_MODEL_ID = "gpt-5-mini";
const SYSTEM_PROMPT =
    [
        "You are a helpful AI assistant.",
        "Answer with a complete final answer in clean markdown.",
        "Use short sections, bullets, tables, or code blocks when they improve clarity.",
        "Do not reveal chain-of-thought, reasoning, or <think> tags.",
        "Do not stop mid-sentence or mid-list.",
        "If the user asks for brevity, keep it brief. Otherwise prefer complete and well-structured answers."
    ].join(" ");
const TITLE_PROMPT =
    "Generate a short chat title from the user's message. Return only the title, 2 to 6 words, no quotes.";
const REQUEST_TIMEOUT_MS = 90000;
const STREAM_START_TIMEOUT_MS = 15000;
const STREAM_IDLE_TIMEOUT_MS = 30000;
const TITLE_TIMEOUT_MS = 15000;

export class AiServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = "AiServiceError";
        this.statusCode = statusCode;
    }
}

const MODEL_LOOKUP = new Map(
    MODEL_REGISTRY.flatMap((modelConfig) => [
        [ modelConfig.id, modelConfig ],
        [ modelConfig.alias, modelConfig ]
    ])
);

const getSupportedModelList = () =>
    MODEL_REGISTRY.map((modelConfig) => `"${modelConfig.alias}"`).join(", ");

const getConfiguredModel = (envVarName, fallbackModelId) => {
    const configuredModel = process.env[envVarName]?.trim();

    if (!configuredModel) {
        return MODEL_LOOKUP.get(fallbackModelId);
    }

    const modelConfig = MODEL_LOOKUP.get(configuredModel);

    if (!modelConfig) {
        throw new AiServiceError(
            `${envVarName} must be one of: ${getSupportedModelList()}.`,
            500
        );
    }

    return modelConfig;
};

const resolveModel = (requestedModel) => {
    if (!requestedModel?.trim()) {
        return getConfiguredModel(DEFAULT_MODEL_ENV_VAR, DEFAULT_MODEL_ID);
    }

    const modelConfig = MODEL_LOOKUP.get(requestedModel.trim());

    if (!modelConfig) {
        throw new AiServiceError(
            `Unsupported model "${requestedModel}". Choose one of: ${getSupportedModelList()}.`,
            400
        );
    }

    return modelConfig;
};

const getTitleModel = () =>
    getConfiguredModel(TITLE_MODEL_ENV_VAR, DEFAULT_TITLE_MODEL_ID);

const getApiKey = () => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new AiServiceError(
            "OPENAI_API_KEY is missing. Add OPENAI_API_KEY to backend/.env.",
            500
        );
    }

    return apiKey;
};

const requireMessage = (message) => {
    const trimmed = message?.trim();

    if (!trimmed) {
        throw new AiServiceError("Message is required.", 400);
    }

    return trimmed;
};

const toText = (content) =>
    typeof content === "string"
        ? content
        : Array.isArray(content)
            ? content
                .map((part) =>
                    typeof part === "string" ? part : part?.text || ""
                )
                .join("")
            : String(content ?? "");

const cleanText = (content) =>
    toText(content)
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<\/?think>/gi, "")
        .trim();

const withTimeout = (promise, createError, timeoutMs) => {
    let timeoutId;

    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(createError()), timeoutMs);
    });

    return Promise.race([ promise, timeout ]).finally(() => clearTimeout(timeoutId));
};

const normalizeError = (error, modelConfig) => {
    if (error instanceof AiServiceError) {
        return error;
    }

    if (error?.message === "terminated") {
        return new AiServiceError(
            `Model "${modelConfig.id}" connection was terminated before completion. Please retry the request.`,
            502
        );
    }

    if (error?.name === "AbortError") {
        return new AiServiceError("AI request was aborted before completion.", 504);
    }

    return error;
};

const createChatModel = (
    modelConfig,
    maxCompletionTokens = modelConfig.defaults.maxTokens
) => {
    getApiKey();

    const modelOptions = {
        model: modelConfig.id,
        maxCompletionTokens
    };

    if (typeof modelConfig.defaults.temperature === "number") {
        modelOptions.temperature = modelConfig.defaults.temperature;
    }

    return new ChatOpenAI(modelOptions);
};

const normalizeHistory = (history = []) =>
    Array.isArray(history)
        ? history
            .filter(
                (item) =>
                    item?.role &&
                    typeof item?.content === "string" &&
                    item.content.trim()
            )
            .map((item) =>
                item.role === "ai"
                    ? new AIMessage(item.content.trim())
                    : new HumanMessage(item.content.trim())
            )
        : [];

const createMessages = (
    message,
    systemPrompt = SYSTEM_PROMPT,
    history = []
) => [
    new SystemMessage(systemPrompt),
    ...normalizeHistory(history),
    new HumanMessage(message)
];

const createReply = (modelConfig, title, text) => ({
    model: modelConfig.id,
    title,
    text,
    fallbackUsed: false,
    fallbackFrom: null
});

const fallbackTitle = (message) =>
    message
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60) || "New Chat";

const cleanTitle = (title, message) =>
    cleanText(title)
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60) || fallbackTitle(message);

const generateTitle = async (message) => {
    const titleModel = getTitleModel();

    try {
        const response = await withTimeout(
            createChatModel(titleModel, 24).invoke(
                createMessages(message, TITLE_PROMPT)
            ),
            () => new AiServiceError("Chat title generation timed out.", 504),
            TITLE_TIMEOUT_MS
        );

        return cleanTitle(response.content, message);
    } catch {
        return fallbackTitle(message);
    }
};

const createThinkStripper = () => {
    let buffer = "";
    let inThink = false;

    return (chunk = "", flush = false) => {
        let source = buffer + chunk;
        let visible = "";
        buffer = "";

        while (source) {
            const tag = inThink ? "</think>" : "<think>";
            const index = source.indexOf(tag);

            if (index === -1) {
                const keep = flush
                    ? 0
                    : Array.from({ length: Math.min(source.length, tag.length - 1) }, (_, i) => i + 1)
                        .reverse()
                        .find((size) => tag.startsWith(source.slice(-size))) || 0;
                const text = source.slice(0, source.length - keep);

                if (!inThink) {
                    visible += text;
                }

                buffer = source.slice(source.length - keep);
                source = "";
                continue;
            }

            if (!inThink) {
                visible += source.slice(0, index);
            }

            source = source.slice(index + tag.length);
            inThink = !inThink;
        }

        return visible;
    };
};

/** Returns the curated OpenAI model list exposed by this backend. */
export function getAvailableModels() {
    const defaultModel = getConfiguredModel(DEFAULT_MODEL_ENV_VAR, DEFAULT_MODEL_ID);

    return MODEL_REGISTRY.map((modelConfig) => ({
        alias: modelConfig.alias,
        model: modelConfig.id,
        label: modelConfig.label,
        apiKeyEnvVar: modelConfig.apiKeyEnvVar,
        defaults: modelConfig.defaults,
        provider: PROVIDER,
        isDefault: modelConfig.id === defaultModel.id
    }));
}

/** Standard JSON chat response with optional follow-up history. */
export async function generateChatReply({
    message,
    history = [],
    generateTitle: shouldGenerateTitle = true,
    model
}) {
    const modelConfig = resolveModel(model);

    try {
        const normalizedMessage = requireMessage(message);
        const titlePromise = shouldGenerateTitle
            ? generateTitle(normalizedMessage)
            : Promise.resolve(null);
        const [ title, response ] = await Promise.all([
            titlePromise,
            withTimeout(
                createChatModel(modelConfig).invoke(
                    createMessages(normalizedMessage, SYSTEM_PROMPT, history)
                ),
                () => new AiServiceError(
                    `Model "${modelConfig.id}" did not finish within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
                    504
                ),
                REQUEST_TIMEOUT_MS
            )
        ]);
        const text = cleanText(response.content);

        if (!text) {
            throw new AiServiceError(`Model "${modelConfig.id}" returned no visible answer.`, 502);
        }

        return createReply(modelConfig, title, text);
    } catch (error) {
        throw normalizeError(error, modelConfig);
    }
}

/** SSE stream used by `/api/chats/message/stream` with optional history. */
export async function* streamChatReply({
    message,
    history = [],
    generateTitle: shouldGenerateTitle = true,
    model,
    signal
}) {
    const stripThink = createThinkStripper();
    const normalizedMessage = requireMessage(message);
    const modelConfig = resolveModel(model);
    const titlePromise = shouldGenerateTitle
        ? generateTitle(normalizedMessage)
        : Promise.resolve(null);
    let stream;

    yield {
        type: "meta",
        data: {
            provider: PROVIDER,
            model: modelConfig.id,
            title: null,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };

    try {
        stream = await withTimeout(
            createChatModel(modelConfig).stream(
                createMessages(normalizedMessage, SYSTEM_PROMPT, history),
                { signal }
            ),
            () => new AiServiceError(
                `Model "${modelConfig.id}" did not start streaming within ${STREAM_START_TIMEOUT_MS / 1000} seconds.`,
                504
            ),
            STREAM_START_TIMEOUT_MS
        );
    } catch (error) {
        throw normalizeError(error, modelConfig);
    }

    let fullText = "";
    const iterator = stream[Symbol.asyncIterator]();

    while (true) {
        let next;

        try {
            next = await withTimeout(
                iterator.next(),
                () => new AiServiceError(
                    `Model "${modelConfig.id}" stopped responding for ${STREAM_IDLE_TIMEOUT_MS / 1000} seconds.`,
                    504
                ),
                STREAM_IDLE_TIMEOUT_MS
            );
        } catch (error) {
            throw normalizeError(error, modelConfig);
        }

        if (next.done) {
            break;
        }

        const token = stripThink(toText(next.value?.content));
        const text = fullText ? token : token.replace(/^\s+/, "");

        if (!text) {
            continue;
        }

        fullText += text;
        yield { type: "token", data: { text } };
    }

    const tail = fullText ? stripThink("", true) : stripThink("", true).replace(/^\s+/, "");

    if (tail) {
        fullText += tail;
        yield { type: "token", data: { text: tail } };
    }

    if (!fullText.trim()) {
        throw new AiServiceError(`Model "${modelConfig.id}" returned no visible answer.`, 502);
    }

    const title = await titlePromise;

    yield {
        type: "done",
        data: {
            provider: PROVIDER,
            model: modelConfig.id,
            title,
            text: fullText,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };
}
