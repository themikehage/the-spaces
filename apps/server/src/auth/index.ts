// SPDX-License-Identifier: MIT
import { createAuth } from "./config";

export const auth = createAuth();

export type Auth = typeof auth;
