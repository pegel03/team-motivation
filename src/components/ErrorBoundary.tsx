import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[React Error Boundary Caught Error]:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm max-w-md w-full space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-slate-900">Er is iets misgegaan</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Er is een onverwachte fout opgetreden bij het laden van de applicatie. Onze excuses voor het ongemak.
              </p>
              {this.state.error && (
                <pre className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-600 max-h-40 overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white rounded-xl py-2 px-4 text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Pagina herladen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
