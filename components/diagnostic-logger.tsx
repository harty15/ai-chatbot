'use client';

import { useEffect } from 'react';

export function DiagnosticLogger() {
  useEffect(() => {
    // Log initial diagnostic info
    console.log('🔍 Diagnostic: Component mounted successfully');
    console.log('🔍 Diagnostic: Environment check:', {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
    });

    // Check for common errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      console.log('🚨 Diagnostic: Console error detected:', args);
      originalError.apply(console, args);
    };

    // Check for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Diagnostic: Unhandled promise rejection:', event.reason);
    };

    // Check for general errors  
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Diagnostic: Unhandled error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}