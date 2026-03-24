import { Router } from "express";
const chatRouter = Router();
import {
    deleteChat,
    getChats,
    getChatMessages,
    getModels,
    sendMessage,
    sendStreamMessage
} from "../controllers/chat.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

chatRouter.get("/", authUser, getChats)
chatRouter.get("/models", authUser, getModels)
chatRouter.get("/:chatId/messages", authUser, getChatMessages)
chatRouter.delete("/:chatId", authUser, deleteChat)
chatRouter.post("/message", authUser, sendMessage)
chatRouter.post("/message/stream", authUser, sendStreamMessage)

export default chatRouter
