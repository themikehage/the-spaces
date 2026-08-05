import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught UI error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="h-dvh w-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
          <div className="h-14 w-14 rounded-2xl bg-error/15 border border-error/30 flex items-center justify-center mb-4 text-error">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold font-display mb-2">Something went wrong</h1>
          <p className="text-xs text-muted-foreground max-w-md mb-6 font-mono bg-surface p-3 rounded-lg border border-border">
            {this.state.error?.message || "An unexpected error occurred in the UI runtime."}
          </p>
          <Button onClick={this.handleReset} variant="primary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Reload Application</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
