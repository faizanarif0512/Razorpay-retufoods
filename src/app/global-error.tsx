'use client';

import React from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white font-sans text-gray-900">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
          Update in Progress
        </h2>
        <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
          A new version of the store has been deployed. Please refresh your browser to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all shadow-sm active:scale-95"
        >
          <RotateCw className="w-4 h-4" />
          <span>Reload Store</span>
        </button>
      </body>
    </html>
  );
}
