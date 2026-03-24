import {
    AiServiceError,
    generateChatReply,
    getAvailableModels
} from "../services/ai.service.js";

export async function getModels(req, res) {
    return res.status(200).json({
        success: true,
        message: "Available AI models fetched successfully",
        data: getAvailableModels()
    });
}

export async function sendMessage(req, res) {
    try {
        const {
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
        } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required.",
                data: {
                    availableModels: getAvailableModels()
                }
            });
        }

        const response = await generateChatReply({
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

        return res.status(200).json({
            success: true,
            message: "AI response generated successfully",
            data: {
                ...response,
                availableModels: getAvailableModels()
            }
        });
    } catch (error) {
        console.error("AI chat error:", error);

        const statusCode = error instanceof AiServiceError
            ? error.statusCode
            : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to generate AI response.",
            data: {
                availableModels: getAvailableModels()
            }
        });
    }
}
