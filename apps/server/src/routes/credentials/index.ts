import { Hono } from "hono";
import { credentialCrudRouter } from "./credential-crud";

export const credentialsRouter = new Hono();

credentialsRouter.route("/", credentialCrudRouter);
