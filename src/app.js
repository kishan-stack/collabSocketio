import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setUpKindeAuth } from "./auth/kindeAuthSetup.js";
import bodyParser from "body-parser";
import { ApiError } from "./utils/ApiError.js";
const app = express();
app.get("/", (req, res) => {
    res.send("hello from deployed app");
});
setUpKindeAuth(app);

app.use(
    cors({
        origin: "*",
    })
);
app.use(bodyParser.json({ strict: false }));
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
        limit: "16kb",
    })
);
app.use(express.static("public"));
app.use(cookieParser());

// routes imports
import testingRouter from "./routes/test.routes.mjs";
import userRouter from "./routes/user.routes.js";
import recommendationRouter from "./routes/recommendation.routes.js";
import teamRouter from "./routes/team.routes.js"
app.use("/api/v1/testing", testingRouter);
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/users", recommendationRouter);
app.use("/api/v1/teams", teamRouter);




// Global error-handling middleware
app.use((err, req, res, next) => {
    if (err.name === "ValidationError") {
        return res.status(400).json({
            status: 400,
            message: err.message,
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            status: err.statusCode,
            message: err.message,
        });
    }

    console.error("Unhandled error:", err); // Log the error for debugging
    res.status(500).json({
        status: 500,
        message: "Internal Server Error",
    });
});

export { app };
