import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import routes from "./routes";

import { requestLogger } from "./middleware/logger";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/error";

const app = express();

// Security
app.use(helmet());

// Cross-origin requests
app.use(cors());

// Compress responses
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Parse URL encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// API Routes
app.use("/api", routes);

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;