import mongoose from "mongoose";
import chatModel from "../models/chat.model.js";
import messageModel from "../models/message.model.js";
import {
    AiServiceError,
    generateChatReply,
    getAvailableModels,
    streamChatReply
} from "../services/ai.service.js";

/**
 * Chat controller.
 *
 * Responsibilities:
 * - list saved chats and messages for the frontend
 * - load or create a chat for the logged-in user
 * - read previous messages for follow-up context
 * - delete a chat and its stored messages
 * - save the user's message
 * - get the AI response
 * - save the AI response
 * - return a small JSON response or SSE stream
 */

const DEFAULT_CHAT_TITLE = "New Chat";

const getChatRequestOptions = (req) => {
    const { message, chatId } = req.body;
    return { message, chatId };
};

const getChatIdParam = (req) => req.params.chatId;

const requireUserId = (req) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new AiServiceError("Unauthorized", 401);
    }

    return userId;
};

const requireMessage = (message) => {
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
        throw new AiServiceError("Message is required.", 400);
    }

    return trimmedMessage;
};

const formatChat = (chat) => ({
    id: String(chat._id),
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
});

const formatMessage = (message) => ({
    id: String(message._id),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt
});

const writeSseEvent = (res, event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

async function findChat(userId, chatId) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new AiServiceError("Invalid chat id.", 400);
    }

    const chat = await chatModel.findOne({ _id: chatId, user: userId });

    if (!chat) {
        throw new AiServiceError("Chat not found.", 404);
    }

    return chat;
}

async function findOrCreateChat(userId, chatId) {
    return chatId ? findChat(userId, chatId) : chatModel.create({ user: userId });
}

async function setChatTitle(chat, title) {
    if (!title?.trim() || chat.title !== DEFAULT_CHAT_TITLE) {
        return chat;
    }

    chat.title = title.trim();
    await chat.save();

    return chat;
}

const touchChat = (chatId) =>
    chatModel.updateOne({ _id: chatId }, { $set: { updatedAt: new Date() } });

const saveMessage = (chatId, role, content) =>
    messageModel.create({ chat: chatId, role, content });

const getChatHistory = async (chatId) =>
    (
        await messageModel
            .find({ chat: chatId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select("role content")
            .lean()
    ).reverse();

const getErrorStatus = (error) =>
    error instanceof AiServiceError ? error.statusCode : 500;

export async function getChats(req, res) {
    try {
        const userId = requireUserId(req);
        const chats = await chatModel
            .find({ user: userId })
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Chats fetched successfully",
            data: chats.map(formatChat)
        });
    } catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: error.message || "Failed to fetch chats.",
            data: null
        });
    }
}

export async function getChatMessages(req, res) {
    try {
        const userId = requireUserId(req);
        const chat = await findChat(userId, getChatIdParam(req));
        const messages = await messageModel
            .find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Chat messages fetched successfully",
            data: {
                chat: formatChat(chat),
                messages: messages.map(formatMessage)
            }
        });
    } catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: error.message || "Failed to fetch chat messages.",
            data: null
        });
    }
}

export async function deleteChat(req, res) {
    try {
        const userId = requireUserId(req);
        const chat = await findChat(userId, getChatIdParam(req));

        await messageModel.deleteMany({ chat: chat._id });
        await chat.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
            data: {
                chatId: String(chat._id)
            }
        });
    } catch (error) {
        return res.status(getErrorStatus(error)).json({
            success: false,
            message: error.message || "Failed to delete chat.",
            data: null
        });
    }
}

export async function getModels(req, res) {
    return res.status(200).json({
        success: true,
        message: "Available AI models fetched successfully",
        data: getAvailableModels()
    });
}

export async function sendMessage(req, res) {
    try {
        const userId = requireUserId(req);
        const { chatId, message } = getChatRequestOptions(req);
        const content = requireMessage(message);
        const chat = await findOrCreateChat(userId, chatId);
        const history = await getChatHistory(chat._id);
        const userMessage = await saveMessage(chat._id, "user", content);
        const aiReply = await generateChatReply({
            message: content,
            history,
            generateTitle: chat.title === DEFAULT_CHAT_TITLE
        });

        await setChatTitle(chat, aiReply.title);

        const aiMessage = await saveMessage(chat._id, "ai", aiReply.text);
        await touchChat(chat._id);

        return res.status(200).json({
            success: true,
            message: "AI response generated successfully",
            data: {
                chat: formatChat(chat),
                model: aiReply.model,
                userMessage: formatMessage(userMessage),
                aiMessage: formatMessage(aiMessage)
            }
        });
    } catch (error) {
        console.error("AI chat error:", error);

        return res.status(getErrorStatus(error)).json({
            success: false,
            message: error.message || "Failed to generate AI response.",
            data: null
        });
    }
}

export async function sendStreamMessage(req, res) {
    let handleClose;

    try {
        const userId = requireUserId(req);
        const { chatId, message } = getChatRequestOptions(req);
        const content = requireMessage(message);
        const chat = await findOrCreateChat(userId, chatId);
        const history = await getChatHistory(chat._id);
        const userMessage = await saveMessage(chat._id, "user", content);
        const abortController = new AbortController();

        handleClose = () => abortController.abort();
        req.on("close", handleClose);

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        for await (const event of streamChatReply({
            message: content,
            history,
            generateTitle: chat.title === DEFAULT_CHAT_TITLE,
            signal: abortController.signal
        })) {
            if (event.type === "meta") {
                await setChatTitle(chat, event.data.title);
                event.data = {
                    ...event.data,
                    chat: formatChat(chat),
                    userMessage: formatMessage(userMessage)
                };
            }

            if (event.type === "done") {
                await setChatTitle(chat, event.data.title);

                const aiMessage = await saveMessage(chat._id, "ai", event.data.text);
                await touchChat(chat._id);

                event.data = {
                    ...event.data,
                    chat: formatChat(chat),
                    userMessage: formatMessage(userMessage),
                    aiMessage: formatMessage(aiMessage)
                };
            }

            if (res.writableEnded || res.destroyed) {
                break;
            }

            writeSseEvent(res, event.type, event.data);
        }

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

        return res.status(getErrorStatus(error)).json({
            success: false,
            message: error.message || "Failed to generate AI response.",
            data: null
        });
    } finally {
        if (handleClose) {
            req.off("close", handleClose);
        }
    }
}
