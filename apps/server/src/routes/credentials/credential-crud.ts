import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CredentialCreateSchema } from "shared";
import { credentialStore } from "../../core/credentials/credential-store";
import { NotFoundError } from "../../core/infra/errors";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export const credentialCrudRouter = new Hono();

credentialCrudRouter.use("/*", authMiddleware);

credentialCrudRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const credentials = await credentialStore.list(username);
  return c.json(credentials);
});

credentialCrudRouter.get("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  const credential = await credentialStore.get(username, id);
  if (!credential) {
    throw new NotFoundError("CREDENTIAL_NOT_FOUND", `Credential '${id}' not found`);
  }
  return c.json(credential);
});

credentialCrudRouter.post("/", zValidator("json", CredentialCreateSchema), async (c) => {
  const { username } = getAuthPayload(c);
  const body = c.req.valid("json");
  const created = await credentialStore.create(username, body);
  return c.json(created, 201);
});

credentialCrudRouter.delete("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  const existing = await credentialStore.get(username, id);
  if (!existing) {
    throw new NotFoundError("CREDENTIAL_NOT_FOUND", `Credential '${id}' not found`);
  }
  await credentialStore.delete(username, id);
  return c.json({ success: true });
});
