import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import * as Tabs from '@radix-ui/react-tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded-lg border bg-white p-4 shadow-sm">
    <div className="text-sm text-steel">{title}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { getAdminReport, getAdminSearches, getAdminAdvancedMetrics, exportAdminSearchesCsv, searchAdminUsers, loading, error } = useApi();
  const [data, setData] = useState<any>(null);
  const [adv, setAdv] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searches, setSearches] = useState<{ items: any[]; total: number; page: number; pages: number; limit: number } | null>(null);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');
  const [userOptions, setUserOptions] = useState<Array<{ id: number; email: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const d = await getAdminReport();
        setData(d);
      } catch (e) {
        // error handled in hook
      }
    })();
  }, [getAdminReport]);

  useEffect(() => {
    (async () => {
      try {
        const a = await getAdminAdvancedMetrics();
        setAdv(a);
      } catch (e) {
        // handled in hook
      }
    })();
  }, [getAdminAdvancedMetrics]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (userQuery && userQuery.length >= 2) {
        const rows = await searchAdminUsers(userQuery, 10);
        if (active) setUserOptions(rows);
      } else {
        setUserOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [userQuery, searchAdminUsers]);

  const searchesTs = useMemo(() => {
    const arr = adv?.searchesPerDay || [];
    return arr.map((it: any) => ({
      date: (it.date || it.day || '').slice(0, 10),
      count: it.count ?? 0,
      ma7: it.ma7 ?? 0,
    }));
  }, [adv]);

  const paymentBreakdown = useMemo(() => {
    const raw = adv?.payments?.methodBreakdown;
    if (!raw) return [] as Array<{ name: string; value: number }>;
    if (Array.isArray(raw)) {
      return raw.map((r: any) => ({ name: r.payment_method ?? 'N/A', value: Number(r.count) || 0 }));
    }
    return Object.entries(raw as any).map(([name, value]) => ({ name, value: Number(value) || 0 }));
  }, [adv]);

  const latencyData = useMemo(() => {
    const lat = adv?.failuresAndLatency?.latencyMs || {};
    return [
      { name: 'p50', value: Number(lat.p50) || 0 },
      { name: 'p95', value: Number(lat.p95) || 0 },
      { name: 'p99', value: Number(lat.p99) || 0 },
    ];
  }, [adv]);

  const signupsTs = useMemo(() => {
    const arr = data?.users?.signupsPerDay || [];
    return arr.map((it: any) => ({ date: (it.day || '').slice(0, 10), count: Number(it.count) || 0 }));
  }, [data]);

  const sessionsTs = useMemo(() => {
    const arr = data?.sessions?.timeseries?.sessionsPerDay || [];
    return arr.map((it: any) => ({ date: (it.day || '').slice(0, 10), count: Number(it.count) || 0 }));
  }, [data]);

  const paidSessionsTs = useMemo(() => {
    const arr = data?.sessions?.timeseries?.paidPerDay || [];
    return arr.map((it: any) => ({ date: (it.day || '').slice(0, 10), count: Number(it.count) || 0 }));
  }, [data]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminSearches(page, limit, {
          from: from || undefined,
          to: to || undefined,
          userId: userId ? Number(userId) : undefined,
        });
        setSearches(res);
      } catch (e) {
        // handled in hook
      }
    })();
  }, [getAdminSearches, page, limit, from, to, userId]);

  const totalPages = useMemo(() => searches?.pages || 1, [searches]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Reporting</h2>

      {loading && <div>Chargement...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {data && (
        <Tabs.Root defaultValue="global" className="w-full">
          <Tabs.List className="inline-flex items-center gap-2 border-b mb-4">
            <Tabs.Trigger value="global" className="px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-black">Vue globale</Tabs.Trigger>
            <Tabs.Trigger value="historique" className="px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-black">Historique</Tabs.Trigger>
            <Tabs.Trigger value="support" className="px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-black">Support</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="global" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Utilisateurs" value={data.users?.totalUsers ?? 0} />
              <StatCard title="Utilisateurs vérifiés" value={data.users?.verifiedUsers ?? 0} />
              <StatCard title="Total recherches" value={data.searches?.totalSearches ?? 0} />
              <StatCard title="Taux de réussite" value={`${Math.round((data.sessions?.successRate || 0) * 100)}%`} />
              <StatCard title="Paiements (total)" value={data.payments?.totalPayments ?? 0} />
            </div>

            {adv && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard title="DAU" value={adv.activeUsers?.dau ?? 0} />
                <StatCard title="WAU" value={adv.activeUsers?.wau ?? 0} />
                <StatCard title="MAU" value={adv.activeUsers?.mau ?? 0} />
                <StatCard title="Email vérifiés %" value={`${Math.round((adv.verification?.rate || 0) * 100)}%`} />
                <StatCard title="Conv. Signup→1ère recherche" value={`${Math.round((adv.signupToFirstSearch?.conversionRate || 0) * 100)}%`} />
                <StatCard title="Echec recherches %" value={`${Math.round((adv.failuresAndLatency?.failureRate || 0) * 100)}%`} />
              </div>
            )}

            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Toutes les recherches</h3>
                <div className="flex items-center gap-2 text-sm">
                  <input type="date" className="border rounded px-2 py-1" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value ? `${e.target.value}T00:00:00` : ''); }} />
                  <input type="date" className="border rounded px-2 py-1" value={to ? to.substring(0,10) : ''} onChange={(e) => { setPage(1); setTo(e.target.value ? `${e.target.value}T23:59:59` : ''); }} />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Email utilisateur"
                      className="border rounded px-2 py-1 w-56"
                      value={userQuery}
                      onChange={(e) => { setPage(1); setUserQuery(e.target.value); }}
                    />
                    {userOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
                        {userOptions.map((u) => (
                          <div
                            key={u.id}
                            className="px-2 py-1 hover:bg-cream-100 cursor-pointer"
                            onClick={() => {
                              setUserId(String(u.id));
                              setUserQuery(u.email);
                              setUserOptions([]);
                            }}
                          >
                            {u.email} <span className="text-xs text-steel">(#{u.id})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {userId && (
                    <button className="border rounded px-2 py-1" onClick={() => { setUserId(''); setUserQuery(''); setPage(1); }}>
                      Effacer utilisateur
                    </button>
                  )}
                  <label className="text-steel">Par page</label>
                  <select className="border rounded px-2 py-1" value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}>
                    {[25, 50, 100, 150, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button className="border rounded px-2 py-1" onClick={() => exportAdminSearchesCsv({ from: from || undefined, to: to || undefined, userId: userId ? Number(userId) : undefined })}>Export CSV</button>
                </div>
              </div>
              {adv && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div className="h-64 p-2 border rounded">
                    <div className="text-sm text-steel mb-1">Recherches/jour (MA7)</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={searchesTs} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" hide={false} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" dot={false} name="Recherches" />
                        <Line type="monotone" dataKey="ma7" stroke="#82ca9d" dot={false} name="MA7" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64 p-2 border rounded">
                    <div className="text-sm text-steel mb-1">Paiements par méthode</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie data={paymentBreakdown} dataKey="value" nameKey="name" outerRadius={80} label>
                          {paymentBreakdown.map((_, idx) => (
                            <Cell key={idx} fill={["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f"][idx % 4]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64 p-2 border rounded">
                    <div className="text-sm text-steel mb-1">Latence (ms) p50/p95/p99</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={latencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-steel border-b">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Utilisateur</th>
                      <th className="py-2 pr-2">Session</th>
                      <th className="py-2 pr-2">URL</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Durée (ms)</th>
                      <th className="py-2 pr-2">Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(searches?.items || []).map((it) => (
                      <tr key={it.id} className="border-b hover:bg-cream-50">
                        <td className="py-2 pr-2">{it.id}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-2">{it.user_id ?? 'anon'}</td>
                        <td className="py-2 pr-2">{it.session_id}</td>
                        <td className="py-2 pr-2 max-w-[420px] truncate" title={it.url}>{it.url}</td>
                        <td className="py-2 pr-2">{it.status ?? ''}</td>
                        <td className="py-2 pr-2">{it.duration_ms ?? ''}</td>
                        <td className="py-2 pr-2">{it.error_code ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="support" className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Récapitulatif des recherches</h3>
                <div className="flex items-center gap-2 text-sm">
                  <input type="date" className="border rounded px-2 py-1" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value ? `${e.target.value}T00:00:00` : ''); }} />
                  <input type="date" className="border rounded px-2 py-1" value={to ? to.substring(0,10) : ''} onChange={(e) => { setPage(1); setTo(e.target.value ? `${e.target.value}T23:59:59` : ''); }} />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Email utilisateur"
                      className="border rounded px-2 py-1 w-56"
                      value={userQuery}
                      onChange={(e) => { setPage(1); setUserQuery(e.target.value); }}
                    />
                    {userOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
                        {userOptions.map((u) => (
                          <div
                            key={u.id}
                            className="px-2 py-1 hover:bg-cream-100 cursor-pointer"
                            onClick={() => {
                              setUserId(String(u.id));
                              setUserQuery(u.email);
                              setUserOptions([]);
                            }}
                          >
                            {u.email} <span className="text-xs text-steel">(#{u.id})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {userId && (
                    <button className="border rounded px-2 py-1" onClick={() => { setUserId(''); setUserQuery(''); setPage(1); }}>
                      Effacer utilisateur
                    </button>
                  )}
                  <label className="text-steel">Par page</label>
                  <select className="border rounded px-2 py-1" value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}>
                    {[25, 50, 100, 150, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-steel border-b">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Utilisateur</th>
                      <th className="py-2 pr-2">Lien</th>
                      <th className="py-2 pr-2">Session</th>
                      <th className="py-2 pr-2">Téléchargement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(searches?.items || []).map((it: any) => (
                      <tr key={it.id} className="border-b hover:bg-cream-50">
                        <td className="py-2 pr-2 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-2">{it.user_email || it.user_id || 'anon'}</td>
                        <td className="py-2 pr-2 max-w-[420px] truncate" title={it.url}>
                          <a href={it.url} target="_blank" rel="noreferrer" className="text-navy hover:underline">{it.url}</a>
                        </td>
                        <td className="py-2 pr-2">{it.session_name || it.session_id}</td>
                        <td className="py-2 pr-2">
                          {it.download_url ? (
                            <a href={it.download_url} target="_blank" rel="noreferrer" className="text-navy hover:underline">Télécharger</a>
                          ) : (
                            <span className="text-steel-200">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <button className="border rounded px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Préc.</button>
                <span className="text-sm text-steel">Page {page} / {totalPages}</span>
                <button className="border rounded px-2 py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</button>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="historique" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-64 p-2 border rounded bg-white">
                <div className="text-sm text-steel mb-1">Inscriptions/jour</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupsTs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 p-2 border rounded bg-white">
                <div className="text-sm text-steel mb-1">Sessions/jour</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionsTs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#82ca9d" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 p-2 border rounded bg-white">
                <div className="text-sm text-steel mb-1">Paiements/jour</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paidSessionsTs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#ff7f7f" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 p-2 border rounded bg-white">
                <div className="text-sm text-steel mb-1">Recherches/jour (MA7)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={searchesTs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" dot={false} />
                    <Line type="monotone" dataKey="ma7" stroke="#82ca9d" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Tabs.Content>

          </Tabs.Root>
      )}
    </div>
  );
};

export default AdminDashboard;
