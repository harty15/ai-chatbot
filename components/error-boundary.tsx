'use client';

import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🔥 ErrorBoundary: Component crashed with error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 ErrorBoundary: Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            An error occurred while rendering this component.
          </p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              console.log('🔄 ErrorBoundary: Attempting to recover from error');
              this.setState({ hasError: false, error: undefined });
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-sm text-left">
              <summary className="cursor-pointer text-gray-500">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}