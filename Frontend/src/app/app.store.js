import { configureStore } from "@eslint/js";
import authReducer from "../features/auth/auth.slice"


export const store = configureStore({
    reducer: {auth: authReducer}
})