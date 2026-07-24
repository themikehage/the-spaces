// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../auth/index";
import { getAuthPayload, sessionMiddleware } from "../auth/middleware";
import { getUserByUsername, isFirstRun } from "../auth/onboarding";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from "../core/errors";

export const authRouter = new Hono();

const RegisterSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
  email: z.string().email().optional(),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.get("/status", async (c) => {
  const needsSetup = await isFirstRun();

  if (needsSetup) {
    return c.json({ needsSetup: true, authenticated: false });
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return c.json({
    needsSetup: false,
    authenticated: !!session,
    user: session ? { username: (session.user as any).username } : null,
    token: session ? session.session.token : null,
  });
});

authRouter.post("/register", zValidator("json", RegisterSchema), async (c) => {
  const { username, password, email } = c.req.valid("json");

  const needsSetup = await isFirstRun();
  if (!needsSetup) {
    throw new ForbiddenError("REGISTRATION_CLOSED", "Registration is closed. An account already exists.");
  }

  const internalEmail = email || `${username}@spaces.internal`;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: internalEmail,
        password,
        name: username,
        username,
        role: "admin",
      } as any,
    });

    if (!result) {
      throw new InternalError("REGISTRATION_FAILED", "Registration failed");
    }

    const signIn = await auth.api.signInEmail({
      body: { email: internalEmail, password },
      asResponse: true,
    });

    const setCookies = signIn.headers.getSetCookie();
    let token: string | null = null;
    for (const cookie of setCookies) {
      c.res.headers.append("Set-Cookie", cookie);
      if (cookie.startsWith("better-auth.session_token=")) {
        token = cookie.split("=")[1].split(";")[0];
      }
    }

    return c.json({ user: { username }, token });
  } catch (err: any) {
    if (err?.statusCode) throw err;
    const message = err?.message || "Registration failed";
    if (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("unique")) {
      throw new ConflictError("USERNAME_TAKEN", "Username already taken");
    }
    throw new InternalError("REGISTRATION_ERROR", message);
  }
});

authRouter.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { username, password } = c.req.valid("json");

  const user = await getUserByUsername(username);
  if (!user) {
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid credentials");
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email: user.email, password },
      asResponse: true,
    });

    if (!result.ok) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid credentials");
    }

    const setCookies = result.headers.getSetCookie();
    let token: string | null = null;
    for (const cookie of setCookies) {
      c.res.headers.append("Set-Cookie", cookie);
      if (cookie.startsWith("better-auth.session_token=")) {
        token = cookie.split("=")[1].split(";")[0];
      }
    }

    return c.json({ user: { username }, token });
  } catch (err: any) {
    if (err?.statusCode) throw err;
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid credentials");
  }
});

authRouter.post("/logout", async (c) => {
  await auth.api.signOut({ headers: c.req.raw.headers });
  return c.json({ ok: true });
});

authRouter.get("/me", sessionMiddleware, (c) => {
  const payload = getAuthPayload(c);
  return c.json({ user: payload });
});

authRouter.post("/password", sessionMiddleware, zValidator("json", ChangePasswordSchema), async (c) => {
  const { currentPassword, newPassword } = c.req.valid("json");
  const { username } = getAuthPayload(c);

  const user = await getUserByUsername(username);
  if (!user) {
    throw new NotFoundError("USER_NOT_FOUND", "User not found");
  }

  try {
    const result = await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: false },
      headers: c.req.raw.headers,
    });

    if (!result) {
      throw new UnauthorizedError("INCORRECT_PASSWORD", "Current password is incorrect");
    }

    return c.json({ ok: true, user: { username } });
  } catch (err: any) {
    if (err?.statusCode) throw err;
    throw new BadRequestError("PASSWORD_CHANGE_FAILED", err?.message || "Failed to change password");
  }
});
