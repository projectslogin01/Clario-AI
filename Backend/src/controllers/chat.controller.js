import {
    AiServiceError,
    generateChatReply,
    getAvailableModels,
    streamChatReply
} from "../services/ai.service.js";

function getChatRequestOptions(req) {
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

    return {
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
    };
}

function writeSseEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function getModels(req, res) {
    return res.status(200).json({
        success: true,
        message: "Available AI models fetched successfully",
        data: getAvailableModels()
    });
}

export async function sendStreamMessage(req, res) {
    let handleClose;

    try {
        const requestOptions = getChatRequestOptions(req);

        if (!requestOptions.message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required.",
                data: {
                    availableModels: getAvailableModels()
                }
            });
        }

        const abortController = new AbortController();
        handleClose = () => abortController.abort();

        req.on("close", handleClose);

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        for await (const event of streamChatReply({
            ...requestOptions,
            signal: abortController.signal
        })) {
            if (res.writableEnded || res.destroyed) {
                break;
            }

            writeSseEvent(res, event.type, event.data);
        }

        req.off("close", handleClose);

        if (!res.writableEnded) {
            res.end();
        }
    } catch (error) {
        console.error("AI chat error:", error);

        if (res.headersSent) {
            if (!res.writableEnded && !res.destroyed) {
                writeSseEvent(res, "error", {
                    message: error.message || "Failed to stream AI response."
                });
                res.end();
            }

            return;
        }

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
    } finally {
        if (handleClose) {
            req.off("close", handleClose);
        }
    }
}

export async function sendMessage(req, res) {
    try {
        const requestOptions = getChatRequestOptions(req);

        if (!requestOptions.message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required.",
                data: {
                    availableModels: getAvailableModels()
                }
            });
        }

        const response = await generateChatReply(requestOptions);

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
