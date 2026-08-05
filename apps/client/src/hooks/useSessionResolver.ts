// SPDX-License-Identifier: MIT
import { sessionsService } from "@/lib/api/sessions.service";
import {
  buildCreateSessionBody,
  getSessionContextPredicate,
  getSessionName,
} from "@/lib/session-utils";
import { useEffect, useRef, useState } from "react";

interface UseSessionResolverParams {
  sessionId: string | null;
  activeProjectName: string | null;
  activeProjectFriendlyName?: string | null;
  activeAgent: { id: string; name: string } | null;
  activeTeam?: { id: string; name: string } | null;
  currentPage: string;
}

export interface UseSessionResolverReturn {
  resolvedSessionId: string | null;
  resolving: boolean;
}

export function useSessionResolver({
  sessionId,
  activeProjectName,
  activeProjectFriendlyName = null,
  activeAgent,
  activeTeam = null,
  currentPage,
}: UseSessionResolverParams): UseSessionResolverReturn {
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<boolean>(false);
  const resolutionIdRef = useRef(0);

  const contextKey = [
    currentPage,
    sessionId,
    activeProjectName,
    activeAgent?.id,
    activeTeam?.id,
  ].join(":");

  useEffect(() => {
    setResolvedSessionId(null);

    if (currentPage !== "chat") {
      setResolving(false);
      return;
    }
    if (sessionId) {
      setResolving(false);
      return;
    }

    const resolutionId = ++resolutionIdRef.current;
    const isCurrentResolution = () => resolutionIdRef.current === resolutionId;

    setResolving(true);

    const resolve = async () => {
      try {
        const all = await sessionsService.fetchSessions();
        if (!isCurrentResolution()) return;

        const context = {
          activeTeam,
          activeAgent,
          activeProjectName,
          activeProjectFriendlyName,
        };

        const filtered = all.filter(getSessionContextPredicate(context));

        if (filtered.length > 0) {
          if (isCurrentResolution()) {
            setResolvedSessionId(filtered[0].id);
            setResolving(false);
          }
          return;
        }

        const sessionName = getSessionName(context, filtered.length);

        const session = await sessionsService.createSession(
          buildCreateSessionBody(sessionName, context),
        );

        if (!isCurrentResolution()) return;

        if (isCurrentResolution()) {
          setResolvedSessionId(session.id);
          setResolving(false);
        }
      } catch {
        if (isCurrentResolution()) {
          setResolving(false);
        }
      }
    };

    resolve();
    return () => {
      if (resolutionIdRef.current === resolutionId) resolutionIdRef.current++;
    };
  }, [contextKey]);

  return {
    resolvedSessionId,
    resolving,
  };
}
