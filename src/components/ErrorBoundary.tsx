import React, { ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-view" className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-red-650 to-orange-500"></div>
            
            <div className="inline-flex items-center justify-center bg-rose-950/50 border border-rose-800/50 text-rose-400 w-16 h-16 rounded-2xl mb-6 animate-pulse">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold font-sans tracking-tight mb-2 text-white">
              Une erreur inattendue est survenue
            </h1>
            <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
              Le système Cash-me a détecté un crash d'interface. Pour votre sécurité, l'opération en cours a été protégée.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left mb-6 font-mono text-[11px] text-rose-300 max-h-40 overflow-y-auto">
                <p className="font-bold underline mb-1">Message d'erreur :</p>
                <p className="whitespace-pre-wrap">{this.state.error.message || String(this.state.error)}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-sans rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/30 transition-all cursor-pointer text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
