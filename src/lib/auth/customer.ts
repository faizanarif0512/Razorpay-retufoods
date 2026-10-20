import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getCustomerById, Customer } from '../db/service';

if (!process.env.CUSTOMER_SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[SECURITY WARNING] CUSTOMER_SESSION_SECRET is not set in production environment.');
}
const SESSION_SECRET = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || 'dev_customer_session_secret_min_32_chars!';
const COOKIE_NAME = 'retu_customer_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days persistent

export function createCustomerToken(customerId: string): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${customerId}.${expires}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyCustomerToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [customerId, expiresStr, sig] = parts;
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Math.floor(Date.now() / 1000) > expires) {
    return null; // Expired
  }

  const expectedPayload = `${customerId}.${expiresStr}`;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(expectedPayload).digest('hex');

  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  return customerId;
}

export async function getAuthenticatedCustomer(): Promise<Customer | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const customerId = verifyCustomerToken(token);
    if (!customerId) return null;

    return getCustomerById(customerId);
  } catch (err) {
    return null;
  }
}

export function getCustomerFromRequest(req: NextRequest): Customer | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const customerId = verifyCustomerToken(token);
  if (!customerId) return null;

  return getCustomerById(customerId);
}

export { COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
