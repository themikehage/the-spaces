import { Hono } from "hono";

const router = new Hono();

router.get("/", (c) => c.json({ ok: true, version: "0.1.0" }));

export { router as healthRouter };
