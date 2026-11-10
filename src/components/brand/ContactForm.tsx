'use client';

import { useState } from 'react';

type Field = { name: string; label: string; type?: string; required?: boolean; textarea?: boolean };

// Posts the form to /api/forms, which stores it in Supabase
export default function ContactForm({
  form,
  fields,
  submitLabel,
  successMessage,
}: {
  form: 'waitlist' | 'location';
  fields: Field[];
  submitLabel: string;
  successMessage: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, ...data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Something went wrong.');
      setMessage(json.message || successMessage);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return <p className="py-10 text-center font-semibold text-brand-pink">{message}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 text-left">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm font-semibold">
            {f.label}
            {f.required && <span className="text-brand-pink"> *</span>}
          </span>
          {f.textarea ? (
            <textarea
              name={f.name}
              required={f.required}
              rows={4}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-pink"
            />
          ) : (
            <input
              name={f.name}
              type={f.type || 'text'}
              required={f.required}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-pink"
            />
          )}
        </label>
      ))}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-brand-pink py-3 font-button text-sm font-medium text-white hover:bg-[#d01039] disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
