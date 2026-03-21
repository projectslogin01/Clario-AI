import "dotenv/config";
import app from "./src/app.js";
import { connectToDB } from "./src/config/database.js";

const PORT = process.env.PORT || 5000;

connectToDB()
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});