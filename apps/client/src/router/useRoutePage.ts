import { useLocation } from "react-router-dom";

export type RoutePage = "chat" | "delegations" | "timeline" | "workspace" | "preview" | "projects" | "settings" | "skills" | "agents" | "org" | "benchmark" | "teams" | "team" | "logs" | "plugins" | "sessions" | "analytics" | "not-found" | "dashboard" | "floor";

export function useRoutePage(): RoutePage {
  const { pathname } = useLocation();
  if (pathname.includes("/analytics") || pathname === "/analytics") return "analytics";
  if (pathname.startsWith("/team/")) return "team";
  if (pathname.includes("/benchmarks")) return "benchmark";
  if (pathname.includes("/org")) return "org";
  if (pathname.includes("/floor")) return "floor";
  if (pathname.includes("/delegations")) return "delegations";
  if (pathname.includes("/timeline")) return "timeline";
  if (pathname.includes("/workspace") || pathname === "/workspace") return "workspace";
  if (pathname.includes("/preview") || pathname === "/preview") return "preview";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/projects") return "projects";
  if (pathname === "/settings") return "settings";
  if (pathname === "/skills") return "skills";
  if (pathname === "/agents") return "agents";
  if (pathname === "/teams") return "teams";
  if (pathname === "/logs") return "logs";
  if (pathname === "/plugins") return "plugins";
  if (pathname === "/sessions") return "sessions";
  return pathname === "/" || pathname.startsWith("/session/") || /\/(projects|agents|teams)\/[^/]+(?:\/chat|\/session\/|$)/.test(pathname) ? "chat" : "not-found";
}
