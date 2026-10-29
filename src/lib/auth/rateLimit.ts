import type { NextRequest } from 'next/server';

// Per-instance sliding window. Serverless instances don't share memory, so this slows
// password guessing rather than strictly capping it.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, number[]>();

function clientKey(req: NextRequest, scope: string, email: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return `${scope}:${ip}:${email.trim().toLowerCase()}`;
}

function recent(key: string): number[] {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function isLoginBlocked(req: NextRequest, scope: string, email: string): boolean {
  return recent(clientKey(req, scope, email)).length >= MAX_FAILURES;
}

export function recordLoginFailure(req: NextRequest, scope: string, email: string): void {
  const key = clientKey(req, scope, email);
  failures.set(key, [...recent(key), Date.now()]);
}

export function clearLoginFailures(req: NextRequest, scope: string, email: string): void {
  failures.delete(clientKey(req, scope, email));
}

export const TOO_MANY_ATTEMPTS = 'Too many failed attempts. Please wait 15 minutes and try again.';
