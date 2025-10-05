import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { connectRedis } from './config/redisClient.js';
import { app } from './app.js'
dotenv.config({
    path: './.env'
})

// Redis Connection
connectRedis();

// DB Connection
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })