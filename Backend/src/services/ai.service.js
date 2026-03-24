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
            maxTokens: 4096
        }
    },
    minimax: {
        id: "minimaxai/minimax-m2.5",
        label: "MiniMax M2.5",
        apiKeyEnvVar: "MINIMAX_API_KEY",
        defaults: {
            temperature: 1,
            topP: 0.95,
            maxTokens: 8192
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

const FALLBACK_MODEL = NVIDIA_MODEL_DEFAULTS.deepseek;
const DEFAULT_MODEL_ID = process.env.NVIDIA_DEFAULT_MODEL || FALLBACK_MODEL.id;

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
            ...FALLBACK_MODEL,
            id: DEFAULT_MODEL_ID,
            label: "Default NVIDIA model"
        };
    }

    const normalizedModel = requestedModel.trim().toLowerCase();

    if (NVIDIA_MODEL_DEFAULTS[normalizedModel]) {
        return NVIDIA_MODEL_DEFAULTS[normalizedModel];
    }

    return findModelConfigById(requestedModel.trim()) || {
        ...FALLBACK_MODEL,
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

function extractReasoningContent(response) {
    const reasoningContent = response?.additional_kwargs?.reasoning_content;

    if (typeof reasoningContent === "string" && reasoningContent.trim()) {
        return reasoningContent.trim();
    }

    const contentBlocks = Array.isArray(response?.contentBlocks)
        ? response.contentBlocks
        : [];

    return contentBlocks
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
        .trim();
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

    if (enableThinking) {
        modelKwargs.chat_template_kwargs = {
            enable_thinking: true
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
    const chatModel = createNvidiaChatModel({
        modelConfig: resolvedModel,
        temperature,
        topP,
        maxTokens: maxCompletionTokens ?? maxTokens,
        topK,
        presencePenalty,
        repetitionPenalty,
        enableThinking
    });

    const messages = systemPrompt?.trim()
        ? [
            new SystemMessage(systemPrompt.trim()),
            new HumanMessage(trimmedMessage)
        ]
        : [new HumanMessage(trimmedMessage)];

    const response = await chatModel.invoke(messages);

    return {
        provider,
        requestedModel: model?.trim() || "default",
        model: resolvedModel.id,
        text: extractTextContent(response.content),
        reasoning: extractReasoningContent(response),
        defaults: resolvedModel.defaults
    };
}

export { NVIDIA_BASE_URL };
