'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, MapPin, Search } from 'lucide-react';

type Row = { state: string; district: string; total: number; serviceable: number };
type Pin = { pincode: string; office_names: string | null; is_serviceable: boolean; state?: string; district?: string };

// Admin → Location Settings: switch delivery on/off by state, city (district) or single PIN code
export default function AdminLocationsPanel() {
  const [coverage, setCoverage] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openState, setOpenState] = useState<string | null>(null);
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pin[] | null>(null);

  const loadCoverage = async () => {
    const res = await fetch('/api/admin/locations');
    const data = await res.json();
    if (data.success) setCoverage(data.coverage);
    setLoading(false);
  };
  useEffect(() => {
    loadCoverage();
  }, []);

  const states = useMemo(() => {
    const map = new Map<string, { total: number; serviceable: number; districts: Row[] }>();
    for (const r of coverage) {
      const s = map.get(r.state) || { total: 0, serviceable: 0, districts: [] };
      s.total += r.total;
      s.serviceable += r.serviceable;
      s.districts.push(r);
      map.set(r.state, s);
    }
    return [...map.entries()];
  }, [coverage]);

  const totals = useMemo(
    () => coverage.reduce((a, r) => ({ total: a.total + r.total, serviceable: a.serviceable + r.serviceable }), { total: 0, serviceable: 0 }),
    [coverage]
  );
  const enabledAreas = coverage.filter((r) => r.serviceable > 0);

  const f = filter.trim().toLowerCase();
  const visibleStates = states.filter(([state, s]) => {
    if (onlyEnabled && s.serviceable === 0) return false;
    if (!f) return true;
    return state.toLowerCase().includes(f) || s.districts.some((d) => d.district.toLowerCase().includes(f));
  });

  async function loadPins(state: string, district: string) {
    setPinsLoading(true);
    const res = await fetch(`/api/admin/locations?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    const data = await res.json();
    setPins(data.pincodes || []);
    setPinsLoading(false);
  }

  async function update(body: Record<string, any>, label: string, key: string) {
    if (body.state && !body.district && !body.pincodes && body.enabled) {
      if (!window.confirm(`Turn on delivery for every PIN code in ${body.state}?`)) return;
    }
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMessage(`${label}: delivery ${body.enabled ? 'enabled' : 'disabled'} for ${data.updated} PIN code${data.updated === 1 ? '' : 's'}.`);
      await loadCoverage();
      if (openState && openDistrict) await loadPins(openState, openDistrict);
      if (results && query) await runSearch();
    } catch (err: any) {
      setMessage(err.message || 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return setResults(null);
    const res = await fetch(`/api/admin/locations?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    setResults(data.results || []);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="PIN codes with delivery" value={totals.serviceable.toLocaleString('en-IN')} />
        <Stat label="Cities / districts enabled" value={String(enabledAreas.length)} />
        <Stat label="PIN codes in India (directory)" value={totals.total.toLocaleString('en-IN')} />
      </div>

      <div className="rounded-2xl border border-retu-border bg-white p-4 text-xs">
        <p className="font-bold text-retu-charcoal">Currently delivering to</p>
        {enabledAreas.length === 0 ? (
          <p className="mt-1 text-red-600">No areas enabled — customers can’t place orders anywhere.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {enabledAreas.map((r) => (
              <span key={r.state + r.district} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                {r.district}, {r.state} · {r.serviceable}/{r.total}
              </span>
            ))}
          </div>
        )}
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</div>}

      <form onSubmit={runSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a PIN code or post office (e.g. 560038 or Indiranagar)"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-retu-charcoal"
          />
        </div>
        <button className="rounded-lg bg-retu-charcoal px-4 text-xs font-semibold text-white">Search</button>
        {results && (
          <button type="button" onClick={() => { setResults(null); setQuery(''); }} className="px-2 text-xs text-gray-500">
            Clear
          </button>
        )}
      </form>

      {results && (
        <div className="rounded-2xl border border-retu-border bg-white">
          {results.length === 0 ? (
            <p className="p-4 text-xs text-gray-500">No PIN codes found.</p>
          ) : (
            <PinTable pins={results} busy={busy} showArea onToggle={(p) => update({ pincodes: [p.pincode], enabled: !p.is_serviceable }, p.pincode, 'pin' + p.pincode)} />
          )}
        </div>
      )}

      <div className="rounded-2xl border border-retu-border bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-retu-border p-4">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter states or cities…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-retu-charcoal"
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" checked={onlyEnabled} onChange={(e) => setOnlyEnabled(e.target.checked)} /> Only enabled areas
          </label>
        </div>

        <ul className="divide-y divide-gray-100">
          {visibleStates.map(([state, s]) => {
            const open = openState === state || (!!f && state.toLowerCase() !== f);
            const districts = s.districts.filter((d) => (!onlyEnabled || d.serviceable > 0) && (!f || state.toLowerCase().includes(f) || d.district.toLowerCase().includes(f)));
            return (
              <li key={state}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    onClick={() => {
                      setOpenState(openState === state ? null : state);
                      setOpenDistrict(null);
                    }}
                    className="flex flex-1 items-center gap-2 text-left text-sm font-bold"
                  >
                    {openState === state ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {state}
                    <span className="text-xs font-normal text-gray-500">
                      {s.districts.length} cities · {s.serviceable > 0 ? <span className="font-semibold text-emerald-700">{s.serviceable} of {s.total} PINs on</span> : `${s.total} PINs`}
                    </span>
                  </button>
                  <Toggles
                    busy={busy === 'state' + state}
                    allOn={s.serviceable === s.total}
                    anyOn={s.serviceable > 0}
                    onEnable={() => update({ state, enabled: true }, state, 'state' + state)}
                    onDisable={() => update({ state, enabled: false }, state, 'state' + state)}
                  />
                </div>

                {(openState === state || (f && open)) && (
                  <ul className="border-t border-gray-100 bg-gray-50/60">
                    {districts.map((d) => {
                      const key = state + '|' + d.district;
                      return (
                        <li key={key}>
                          <div className="flex items-center justify-between gap-3 py-2.5 pl-10 pr-4">
                            <button
                              onClick={() => {
                                if (openDistrict === key) return setOpenDistrict(null);
                                setOpenState(state);
                                setOpenDistrict(key);
                                loadPins(state, d.district);
                              }}
                              className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"
                            >
                              {openDistrict === key ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              {d.district}
                              <span className={`text-xs font-normal ${d.serviceable ? 'font-semibold text-emerald-700' : 'text-gray-500'}`}>
                                {d.serviceable ? `${d.serviceable} of ${d.total} PINs on` : `${d.total} PINs`}
                              </span>
                            </button>
                            <Toggles
                              busy={busy === 'district' + key}
                              allOn={d.serviceable === d.total}
                              anyOn={d.serviceable > 0}
                              onEnable={() => update({ state, district: d.district, enabled: true }, d.district, 'district' + key)}
                              onDisable={() => update({ state, district: d.district, enabled: false }, d.district, 'district' + key)}
                            />
                          </div>
                          {openDistrict === key && (
                            <div className="pb-3 pl-14 pr-4">
                              {pinsLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PinTable pins={pins} busy={busy} onToggle={(p) => update({ pincodes: [p.pincode], enabled: !p.is_serviceable }, p.pincode, 'pin' + p.pincode)} />
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-[11px] text-gray-500">
        Customers check their PIN code before buying; checkout and subscriptions also refuse any PIN not switched on here. Source: India Post All India
        Pincode Directory (data.gov.in).
      </p>
    </div>
  );
}

function Toggles({ busy, allOn, anyOn, onEnable, onDisable }: { busy: boolean; allOn: boolean; anyOn: boolean; onEnable: () => void; onDisable: () => void }) {
  if (busy) return <Loader2 className="h-4 w-4 animate-spin" />;
  return (
    <div className="flex shrink-0 gap-1.5 text-[11px] font-semibold">
      <button onClick={onEnable} disabled={allOn} className="rounded-md border border-emerald-300 px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
        Enable all
      </button>
      <button onClick={onDisable} disabled={!anyOn} className="rounded-md border border-gray-300 px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
        Disable all
      </button>
    </div>
  );
}

function PinTable({ pins, busy, onToggle, showArea }: { pins: Pin[]; busy: string | null; onToggle: (p: Pin) => void; showArea?: boolean }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {pins.map((p) => (
        <label key={p.pincode} className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs">
          {busy === 'pin' + p.pincode ? (
            <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <input type="checkbox" checked={p.is_serviceable} onChange={() => onToggle(p)} className="mt-0.5 accent-emerald-600" />
          )}
          <span>
            <span className="font-bold">{p.pincode}</span>
            {showArea && <span className="text-gray-500"> · {p.district}, {p.state}</span>}
            <span className="block text-gray-500">{p.office_names}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-retu-border bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-retu-charcoal">{value}</p>
    </div>
  );
}
