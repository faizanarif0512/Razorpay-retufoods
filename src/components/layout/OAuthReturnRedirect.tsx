'use client';

import { useEffect } from 'react';

const LOGIN_PATH = '/store/account/login';

// If Supabase falls back to the Site URL after Google sign-in (e.g. the redirect URL
// wasn't on its allow list), the session lands on whatever page that is. Forward it to
// the login page, which is the only place that finishes the sign-in.
export default function OAuthReturnRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (pathname === LOGIN_PATH) return;
    const query = new URLSearchParams(search);
    const isOAuthReturn =
      hash.includes('access_token=') ||
      hash.includes('error_description=') ||
      query.has('error_description');
    if (isOAuthReturn) {
      window.location.replace(`${LOGIN_PATH}${search}${hash}`);
    }
  }, []);

  return null;
}
