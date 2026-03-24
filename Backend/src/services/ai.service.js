import {
    AIMessage,
    HumanMessage,
    SystemMessage
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

/**
 * NVIDIA chat service.
 *
 * Env:
 * - MINIMAX_API_KEY or NVIDIA_API_KEY
 * - NVIDIA_BASE_URL (optional, defaults to NVIDIA hosted endpoint)
 */

const PROVIDER = "nvidia";
const NVIDIA_BASE_URL =
    process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const MODEL = Object.freeze({
    alias: "minimax",
    id: "minimaxai/minimax-m2.5",
    label: "MiniMax M2.5",
    apiKeyEnvVar: "MINIMAX_API_KEY",
    defaults: { temperature: 0.6, topP: 0.95, maxTokens: 256 }
});
const SYSTEM_PROMPT =
    "Answer directly with the final answer only. Do not reveal chain-of-thought, reasoning, or <think> tags.";
const TITLE_PROMPT =
    "Generate a short chat title from the user's message. Return only the title, 2 to 6 words, no quotes.";
const REQUEST_TIMEOUT_MS = 45000;
const STREAM_START_TIMEOUT_MS = 20000;
const STREAM_IDLE_TIMEOUT_MS = 20000;
const TITLE_TIMEOUT_MS = 15000;

export class AiServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = "AiServiceError";
        this.statusCode = statusCode;
    }
}

const getApiKey = () => {
    const apiKey = process.env[MODEL.apiKeyEnvVar] || process.env.NVIDIA_API_KEY;

    if (!apiKey) {
        throw new AiServiceError(
            `${MODEL.apiKeyEnvVar} is missing. Add ${MODEL.apiKeyEnvVar} or NVIDIA_API_KEY to Backend/.env.`,
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

const normalizeError = (error) => {
    if (error instanceof AiServiceError) {
        return error;
    }

    if (error?.message === "terminated") {
        return new AiServiceError(
            `Model "${MODEL.id}" connection was terminated by NVIDIA. Please retry the request.`,
            502
        );
    }

    if (error?.name === "AbortError") {
        return new AiServiceError("AI request was aborted before completion.", 504);
    }

    return error;
};

const createChatModel = (maxCompletionTokens = MODEL.defaults.maxTokens) =>
    new ChatOpenAI({
        model: MODEL.id,
        temperature: MODEL.defaults.temperature,
        topP: MODEL.defaults.topP,
        maxCompletionTokens,
        configuration: { apiKey: getApiKey(), baseURL: NVIDIA_BASE_URL }
    });

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

const createReply = (title, text) => ({
    model: MODEL.id,
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
    try {
        const response = await withTimeout(
            createChatModel(24).invoke(createMessages(message, TITLE_PROMPT)),
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

/** Returns the single model exposed by this backend. */
export function getAvailableModels() {
    return [
        {
            alias: MODEL.alias,
            model: MODEL.id,
            label: MODEL.label,
            apiKeyEnvVar: MODEL.apiKeyEnvVar,
            defaults: MODEL.defaults,
            provider: PROVIDER
        }
    ];
}

/** Standard JSON chat response with optional follow-up history. */
export async function generateChatReply({
    message,
    history = [],
    generateTitle: shouldGenerateTitle = true
}) {
    try {
        const normalizedMessage = requireMessage(message);
        const titlePromise = shouldGenerateTitle
            ? generateTitle(normalizedMessage)
            : Promise.resolve(null);
        const [ title, response ] = await Promise.all([
            titlePromise,
            withTimeout(
                createChatModel().invoke(
                    createMessages(normalizedMessage, SYSTEM_PROMPT, history)
                ),
                () => new AiServiceError(
                    `Model "${MODEL.id}" did not finish within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
                    504
                ),
                REQUEST_TIMEOUT_MS
            )
        ]);
        const text = cleanText(response.content);

        if (!text) {
            throw new AiServiceError(`Model "${MODEL.id}" returned no visible answer.`, 502);
        }

        return createReply(title, text);
    } catch (error) {
        throw normalizeError(error);
    }
}

/** SSE stream used by `/api/chats/message/stream` with optional history. */
export async function* streamChatReply({
    message,
    history = [],
    generateTitle: shouldGenerateTitle = true,
    signal
}) {
    const stripThink = createThinkStripper();
    const normalizedMessage = requireMessage(message);
    const titlePromise = shouldGenerateTitle
        ? generateTitle(normalizedMessage)
        : Promise.resolve(null);
    let stream;

    try {
        stream = await withTimeout(
            createChatModel().stream(
                createMessages(normalizedMessage, SYSTEM_PROMPT, history),
                { signal }
            ),
            () => new AiServiceError(
                `Model "${MODEL.id}" did not start streaming within ${STREAM_START_TIMEOUT_MS / 1000} seconds.`,
                504
            ),
            STREAM_START_TIMEOUT_MS
        );
    } catch (error) {
        throw normalizeError(error);
    }

    let fullText = "";
    const iterator = stream[Symbol.asyncIterator]();
    const title = await titlePromise;

    yield {
        type: "meta",
        data: {
            provider: PROVIDER,
            model: MODEL.id,
            title,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };

    while (true) {
        let next;

        try {
            next = await withTimeout(
                iterator.next(),
                () => new AiServiceError(
                    `Model "${MODEL.id}" stopped responding for ${STREAM_IDLE_TIMEOUT_MS / 1000} seconds.`,
                    504
                ),
                STREAM_IDLE_TIMEOUT_MS
            );
        } catch (error) {
            throw normalizeError(error);
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
        throw new AiServiceError(`Model "${MODEL.id}" returned no visible answer.`, 502);
    }

    yield {
        type: "done",
        data: {
            provider: PROVIDER,
            model: MODEL.id,
            title,
            text: fullText,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };
}

export { NVIDIA_BASE_URL };
