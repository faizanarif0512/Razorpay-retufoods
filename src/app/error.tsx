'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, AlertTriangle, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it's a chunk load error (common when a new deployment invalidates old asset hashes),
    // automatically trigger a hard reload once to fetch the fresh bundle.
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('ChunkLoadError') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch');

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('retu_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('retu_chunk_reload', now.toString());
        window.location.reload();
      }
    }

    console.error('[CLIENT RUNTIME ERROR]:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-white">
      <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-200">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-extrabold text-retu-charcoal tracking-tight mb-2">
        A newer version was just published
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
        We recently deployed updates to the store. Please refresh the page or clear your browser cache to load the latest release.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-retu-charcoal text-white text-xs font-bold hover:bg-black transition-all shadow-sm active:scale-95"
        >
          <RotateCw className="w-4 h-4" />
          <span>Reload Store</span>
        </button>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-retu-warm-white text-retu-charcoal border border-retu-border text-xs font-semibold hover:bg-gray-100 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Go to Store Home</span>
        </Link>
      </div>
    </div>
  );
}
