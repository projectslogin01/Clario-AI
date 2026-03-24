import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_PROVIDER = "nvidia";
const NVIDIA_BASE_URL =
    process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

const NVIDIA_MODEL_DEFAULTS = Object.freeze({
    deepseek: {
        id: "deepseek-ai/deepseek-r1-distill-qwen-32b",
        label: "DeepSeek R1 Distill Qwen 32B",
        apiKeyEnvVar: "DEEPSEEK_API_KEY",
        defaults: {
            temperature: 0.6,
            topP: 0.7,
            maxTokens: 4096,
            enableThinking: false
        }
    },
    minimax: {
        id: "minimaxai/minimax-m2.5",
        label: "MiniMax M2.5",
        apiKeyEnvVar: "MINIMAX_API_KEY",
        defaults: {
            temperature: 1,
            topP: 0.95,
            maxTokens: 8192,
            enableThinking: false
        }
    },
    qwen: {
        id: "qwen/qwen3.5-397b-a17b",
        label: "Qwen 3.5 397B A17B",
        apiKeyEnvVar: "QWEN_API_KEY",
        defaults: {
            temperature: 0.6,
            topP: 0.95,
            maxTokens: 16384,
            topK: 20,
            presencePenalty: 0,
            repetitionPenalty: 1,
            enableThinking: true
        }
    }
});

const RECOVERY_MODEL = NVIDIA_MODEL_DEFAULTS.minimax;
const DEFAULT_MODEL_ID = RECOVERY_MODEL.id;

export class AiServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = "AiServiceError";
        this.statusCode = statusCode;
    }
}

function getNvidiaApiKey(modelConfig) {
    const preferredEnvVar = modelConfig?.apiKeyEnvVar;
    const apiKey = preferredEnvVar
        ? process.env[preferredEnvVar] || process.env.NVIDIA_API_KEY
        : process.env.NVIDIA_API_KEY;

    if (!apiKey) {
        throw new AiServiceError(
            preferredEnvVar
                ? `${preferredEnvVar} is missing. Add ${preferredEnvVar} or NVIDIA_API_KEY to Backend/.env before using chat models.`
                : "NVIDIA_API_KEY is missing. Add it to Backend/.env before using chat models.",
            500
        );
    }

    return apiKey;
}

function normalizeNumber(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizeBoolean(value, fallback) {
    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return fallback;
}

function findModelConfigById(modelId) {
    return Object.values(NVIDIA_MODEL_DEFAULTS).find(
        (config) => config.id === modelId
    );
}

function resolveModelConfig(requestedModel) {
    if (!requestedModel) {
        return findModelConfigById(DEFAULT_MODEL_ID) || {
            ...RECOVERY_MODEL,
            id: DEFAULT_MODEL_ID,
            label: "Default NVIDIA model"
        };
    }

    const normalizedModel = requestedModel.trim().toLowerCase();

    if (NVIDIA_MODEL_DEFAULTS[normalizedModel]) {
        return NVIDIA_MODEL_DEFAULTS[normalizedModel];
    }

    return findModelConfigById(requestedModel.trim()) || {
        ...RECOVERY_MODEL,
        id: requestedModel.trim(),
        label: requestedModel.trim()
    };
}

function extractTextContent(content) {
    if (typeof content === "string") {
        return content.trim();
    }

    if (!Array.isArray(content)) {
        return String(content ?? "").trim();
    }

    return content
        .map((part) => {
            if (typeof part === "string") {
                return part;
            }

            if (typeof part?.text === "string") {
                return part.text;
            }

            return "";
        })
        .join("")
        .trim();
}

function extractTextDelta(content) {
    if (typeof content === "string") {
        return content;
    }

    if (!Array.isArray(content)) {
        return String(content ?? "");
    }

    return content
        .map((part) => {
            if (typeof part === "string") {
                return part;
            }

            if (typeof part?.text === "string") {
                return part.text;
            }

            return "";
        })
        .join("");
}

function extractReasoningContent(response, trim = true) {
    const reasoningContent = response?.additional_kwargs?.reasoning_content;

    if (typeof reasoningContent === "string" && reasoningContent.trim()) {
        return trim ? reasoningContent.trim() : reasoningContent;
    }

    const contentBlocks = Array.isArray(response?.contentBlocks)
        ? response.contentBlocks
        : [];

    const combinedReasoning = contentBlocks
        .map((block) => {
            if (typeof block?.reasoning === "string") {
                return block.reasoning;
            }

            if (typeof block?.thinking === "string") {
                return block.thinking;
            }

            if (
                (block?.type === "reasoning" || block?.type === "thinking") &&
                typeof block?.text === "string"
            ) {
                return block.text;
            }

            return "";
        })
        .join("")
    ;

    return trim ? combinedReasoning.trim() : combinedReasoning;
}

function getTrailingPartialTagLength(text, tag) {
    for (let length = Math.min(text.length, tag.length - 1); length > 0; length -= 1) {
        if (tag.startsWith(text.slice(-length))) {
            return length;
        }
    }

    return 0;
}

function createThinkingParser() {
    let buffer = "";
    let insideThink = false;

    return {
        push(text) {
            if (!text) {
                return {
                    visible: "",
                    reasoning: ""
                };
            }

            let source = buffer + text;
            buffer = "";
            let visible = "";
            let reasoning = "";

            while (source.length > 0) {
                const tag = insideThink ? "</think>" : "<think>";
                const tagIndex = source.indexOf(tag);

                if (tagIndex === -1) {
                    const pendingTagLength = getTrailingPartialTagLength(source, tag);
                    const emittedText = source.slice(
                        0,
                        source.length - pendingTagLength
                    );

                    if (insideThink) {
                        reasoning += emittedText;
                    } else {
                        visible += emittedText;
                    }

                    buffer = source.slice(source.length - pendingTagLength);
                    source = "";
                    continue;
                }

                const emittedText = source.slice(0, tagIndex);

                if (insideThink) {
                    reasoning += emittedText;
                } else {
                    visible += emittedText;
                }

                source = source.slice(tagIndex + tag.length);
                insideThink = !insideThink;
            }

            return { visible, reasoning };
        },
        flush() {
            const remainingText = buffer;
            buffer = "";

            return insideThink
                ? { visible: "", reasoning: remainingText }
                : { visible: remainingText, reasoning: "" };
        }
    };
}

function splitThinkingContent(content) {
    const parser = createThinkingParser();
    const parsed = parser.push(extractTextDelta(content));
    const remaining = parser.flush();

    return {
        visible: `${parsed.visible}${remaining.visible}`.trim(),
        reasoning: `${parsed.reasoning}${remaining.reasoning}`.trim()
    };
}

function buildModelKwargs({
    topK,
    repetitionPenalty,
    enableThinking
}) {
    const modelKwargs = {};

    if (topK !== undefined) {
        modelKwargs.top_k = topK;
    }

    if (repetitionPenalty !== undefined) {
        modelKwargs.repetition_penalty = repetitionPenalty;
    }

    if (typeof enableThinking === "boolean") {
        modelKwargs.chat_template_kwargs = {
            enable_thinking: enableThinking
        };
    }

    return Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined;
}

function createNvidiaChatModel({
    modelConfig,
    temperature,
    topP,
    maxTokens,
    topK,
    presencePenalty,
    repetitionPenalty,
    enableThinking
}) {
    const defaults = modelConfig.defaults;

    return new ChatOpenAI({
        model: modelConfig.id,
        temperature: normalizeNumber(temperature, defaults.temperature),
        topP: normalizeNumber(topP, defaults.topP),
        maxCompletionTokens: normalizeNumber(maxTokens, defaults.maxTokens),
        presencePenalty: normalizeNumber(
            presencePenalty,
            defaults.presencePenalty
        ),
        modelKwargs: buildModelKwargs({
            topK: normalizeNumber(topK, defaults.topK),
            repetitionPenalty: normalizeNumber(
                repetitionPenalty,
                defaults.repetitionPenalty
            ),
            enableThinking: normalizeBoolean(
                enableThinking,
                defaults.enableThinking === true
            )
        }),
        configuration: {
            apiKey: getNvidiaApiKey(modelConfig),
            baseURL: NVIDIA_BASE_URL
        }
    });
}

function buildMessages({ message, systemPrompt }) {
    return systemPrompt?.trim()
        ? [
            new SystemMessage(systemPrompt.trim()),
            new HumanMessage(message)
        ]
        : [new HumanMessage(message)];
}

function shouldAttemptRecovery(primaryModelConfig) {
    return primaryModelConfig.id !== RECOVERY_MODEL.id;
}

function buildResponsePayload({
    provider,
    requestedModel,
    modelConfig,
    response,
    fallbackFrom
}) {
    const splitContent = splitThinkingContent(response.content);
    const metadataReasoning = extractReasoningContent(response);
    const reasoning = [splitContent.reasoning, metadataReasoning]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join("\n")
        .trim();

    return {
        provider,
        requestedModel,
        model: modelConfig.id,
        text: splitContent.visible || extractTextContent(response.content),
        reasoning,
        defaults: modelConfig.defaults,
        fallbackUsed: Boolean(fallbackFrom),
        fallbackFrom: fallbackFrom?.id || null
    };
}

async function invokeModel({
    requestedModel,
    provider,
    modelConfig,
    messages,
    temperature,
    topP,
    maxTokens,
    topK,
    presencePenalty,
    repetitionPenalty,
    enableThinking,
    fallbackFrom
}) {
    const chatModel = createNvidiaChatModel({
        modelConfig,
        temperature,
        topP,
        maxTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    });

    const response = await chatModel.invoke(messages);

    return buildResponsePayload({
        provider,
        requestedModel,
        modelConfig,
        response,
        fallbackFrom
    });
}

function createNormalizedRequest(options) {
    const {
        message,
        model,
        provider = DEFAULT_PROVIDER,
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        maxCompletionTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    } = options;

    if (provider !== DEFAULT_PROVIDER) {
        throw new AiServiceError(
            `Unsupported provider "${provider}". This service is configured for NVIDIA-hosted models.`,
            400
        );
    }

    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
        throw new AiServiceError("Message is required.", 400);
    }

    const resolvedModel = resolveModelConfig(model);

    return {
        provider,
        requestedModel: model?.trim() || "default",
        resolvedModel,
        messages: buildMessages({
            message: trimmedMessage,
            systemPrompt
        }),
        temperature,
        topP,
        maxTokens: maxCompletionTokens ?? maxTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    };
}

export function getAvailableModels() {
    return Object.entries(NVIDIA_MODEL_DEFAULTS).map(([ alias, config ]) => ({
        alias,
        model: config.id,
        label: config.label,
        apiKeyEnvVar: config.apiKeyEnvVar,
        defaults: config.defaults,
        provider: DEFAULT_PROVIDER
    }));
}

export async function generateChatReply({
    message,
    model,
    provider = DEFAULT_PROVIDER,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    maxCompletionTokens,
    topK,
    presencePenalty,
    repetitionPenalty,
    enableThinking
}) {
    const request = createNormalizedRequest({
        message,
        model,
        provider,
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        maxCompletionTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    });

    try {
        return await invokeModel({
            ...request,
            modelConfig: request.resolvedModel
        });
    } catch (error) {
        if (!shouldAttemptRecovery(request.resolvedModel)) {
            throw error;
        }

        console.error(
            `Primary model "${request.resolvedModel.id}" failed. Falling back to "${RECOVERY_MODEL.id}".`,
            error
        );

        return invokeModel({
            ...request,
            modelConfig: RECOVERY_MODEL,
            fallbackFrom: request.resolvedModel
        });
    }
}

async function* streamModel({
    requestedModel,
    provider,
    modelConfig,
    messages,
    temperature,
    topP,
    maxTokens,
    topK,
    presencePenalty,
    repetitionPenalty,
    enableThinking,
    fallbackFrom,
    signal
}) {
    const chatModel = createNvidiaChatModel({
        modelConfig,
        temperature,
        topP,
        maxTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    });

    const stream = await chatModel.stream(messages, { signal });
    let streamedText = "";
    let streamedReasoning = "";
    const thinkingParser = createThinkingParser();

    yield {
        type: "meta",
        data: {
            provider,
            requestedModel,
            model: modelConfig.id,
            defaults: modelConfig.defaults,
            fallbackUsed: Boolean(fallbackFrom),
            fallbackFrom: fallbackFrom?.id || null
        }
    };

    for await (const chunk of stream) {
        const text = extractTextDelta(chunk.content);
        const parsedText = thinkingParser.push(text);
        const reasoning = `${parsedText.reasoning}${extractReasoningContent(chunk, false)}`;
        const visibleText = streamedText.length === 0
            ? parsedText.visible.replace(/^\s+/, "")
            : parsedText.visible;

        if (visibleText) {
            streamedText += visibleText;
            yield {
                type: "token",
                data: {
                    text: visibleText
                }
            };
        }

        if (reasoning) {
            streamedReasoning += reasoning;
            yield {
                type: "reasoning",
                data: {
                    text: reasoning
                }
            };
        }
    }

    const remainingText = thinkingParser.flush();
    const finalVisibleText = streamedText.length === 0
        ? remainingText.visible.replace(/^\s+/, "")
        : remainingText.visible;

    if (finalVisibleText) {
        streamedText += finalVisibleText;
        yield {
            type: "token",
            data: {
                text: finalVisibleText
            }
        };
    }

    if (remainingText.reasoning) {
        streamedReasoning += remainingText.reasoning;
        yield {
            type: "reasoning",
            data: {
                text: remainingText.reasoning
            }
        };
    }

    yield {
        type: "done",
        data: {
            provider,
            requestedModel,
            model: modelConfig.id,
            text: streamedText,
            reasoning: streamedReasoning,
            defaults: modelConfig.defaults,
            fallbackUsed: Boolean(fallbackFrom),
            fallbackFrom: fallbackFrom?.id || null
        }
    };
}

export async function* streamChatReply({
    message,
    model,
    provider = DEFAULT_PROVIDER,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    maxCompletionTokens,
    topK,
    presencePenalty,
    repetitionPenalty,
    enableThinking,
    signal
}) {
    const request = createNormalizedRequest({
        message,
        model,
        provider,
        systemPrompt,
        temperature,
        topP,
        maxTokens,
        maxCompletionTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    });

    let emittedContent = false;

    try {
        for await (const event of streamModel({
            ...request,
            modelConfig: request.resolvedModel,
            signal
        })) {
            if (event.type === "token" || event.type === "reasoning") {
                emittedContent = true;
            }

            yield event;
        }

        return;
    } catch (error) {
        if (emittedContent || !shouldAttemptRecovery(request.resolvedModel)) {
            throw error;
        }

        console.error(
            `Primary stream model "${request.resolvedModel.id}" failed before emitting content. Falling back to "${RECOVERY_MODEL.id}".`,
            error
        );
    }

    yield* streamModel({
        ...request,
        modelConfig: RECOVERY_MODEL,
        fallbackFrom: request.resolvedModel,
        signal
    });
}

export { NVIDIA_BASE_URL };
