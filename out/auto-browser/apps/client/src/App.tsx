import "./styles/index.css";
import { Layout } from "./components/Layout.tsx";
import { ToastProvider } from "./components/ui/Toast.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
