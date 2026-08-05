// SPDX-License-Identifier: MIT
import { storage } from "@/lib/storage";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

export function McpRedirectRoute() {
  useEffect(() => {
    storage.set("settingsActiveTab", "mcp");
  }, []);
  return <Navigate to="/settings" replace />;
}
