import React from "react";
import { useSessions } from "@/hooks/useSessions";
import { SessionList } from "./SessionList";
import { ChatArea } from "./ChatArea";

export const Layout: React.FC = () => {
  const sessionManager = useSessions();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      {/* Sidebar */}
      <SessionList sessionManager={sessionManager} />

      {/* Main chat view */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatArea sessionId={sessionManager.selectedId} />
      </main>
    </div>
  );
};

export default Layout;
