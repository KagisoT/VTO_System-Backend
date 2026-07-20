import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import routes from "./routes";
import { requestLogger } from "./middleware/logger";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/error";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(requestLogger);
app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

export default app;