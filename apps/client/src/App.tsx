// SPDX-License-Identifier: MIT
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { LiteralsProvider } from "@/lib";
import { AppRoutes } from "@/router/routes";
import { BrowserRouter } from "react-router-dom";

export function App() {
  return (
    <AuthProvider>
      <LiteralsProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </LiteralsProvider>
    </AuthProvider>
  );
}
