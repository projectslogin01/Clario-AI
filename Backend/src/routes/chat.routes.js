import { Router } from "express";
const chatRouter = Router();
import {
    getModels,
    sendMessage,
    sendStreamMessage
} from "../controllers/chat.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

chatRouter.get("/models", authUser, getModels)
chatRouter.post("/message", authUser, sendMessage)
chatRouter.post("/message/stream", authUser, sendStreamMessage)

export default chatRouter
