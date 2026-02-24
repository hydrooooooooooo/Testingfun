import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SearchFiltersBar from '@/components/admin/SearchFiltersBar';
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
import { BarChart3 } from 'lucide-react';
import { BUSINESS_SECTORS, COMPANY_SIZES } from '@/constants/userProfile';

// Design system chart colors
const CHART_COLORS = {
  primary: '#1A3263',   // navy
  secondary: '#547792', // steel
  accent: '#FAB95B',    // gold
  error: '#EF4444',     // red
};

const EXTENDED_COLORS = [
  '#1A3263', '#547792', '#FAB95B', '#E8E2DB', '#3B82F6',
  '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316',
];

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <Card className="bg-white border-cream-300 shadow-sm">
    <CardContent className="p-4">
      <div className="text-sm text-steel">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-navy">{value}</div>
    </CardContent>
  </Card>
);

const SkeletonCard: React.FC = () => (
  <Card className="bg-white border-cream-300 shadow-sm">
    <CardContent className="p-4 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

const EmptyTable: React.FC<{ message?: string }> = ({ message }) => (
  <div className="py-12 text-center text-steel">
    {message || 'Aucune donnée disponible'}
  </div>
);

const AdminDashboard: React.FC = () => {
  const { getAdminReport, getAdminSearches, getAdminAdvancedMetrics, exportAdminSearchesCsv, searchAdminUsers, getAdminAIUsage, loading, error } = useApi();
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getAdminReport();
        setData(d);
      } catch (e) {
        // error handled in hook
      } finally {
        setInitialLoading(false);
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
    (async () => {
      try {
        const a = await getAdminAIUsage();
        setAiUsage(a);
      } catch (e) {
        // handled
      }
    })();
  }, [getAdminAIUsage]);

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
    return () => { active = false; };
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

  const sectorData = useMemo(() => {
    const raw = data?.users?.sectorDistribution || [];
    const labelMap = Object.fromEntries(BUSINESS_SECTORS.map((s) => [s.value, s.label]));
    return raw.map((r: any) => ({ name: labelMap[r.sector] || r.sector, value: r.count }));
  }, [data]);

  const sizeData = useMemo(() => {
    const raw = data?.users?.sizeDistribution || [];
    const labelMap = Object.fromEntries(COMPANY_SIZES.map((s) => [s.value, s.label]));
    return raw.map((r: any) => ({ name: labelMap[r.size] || r.size, value: r.count }));
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

  const filterProps = {
    from, to, userQuery, userOptions, userId, limit,
    onFromChange: (v: string) => { setPage(1); setFrom(v); },
    onToChange: (v: string) => { setPage(1); setTo(v); },
    onUserQueryChange: (v: string) => { setPage(1); setUserQuery(v); },
    onUserSelect: (id: string, email: string) => { setUserId(id); setUserQuery(email); setUserOptions([]); },
    onClearUser: () => { setUserId(''); setUserQuery(''); setPage(1); },
    onLimitChange: (v: number) => { setPage(1); setLimit(v); },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-navy" />
        <h2 className="text-2xl font-semibold text-navy">Reporting</h2>
      </div>

      {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</div>}

      {initialLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <Card className="bg-white border-cream-300 shadow-sm p-4">
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      ) : data && (
        <Tabs.Root defaultValue="global" className="w-full">
          <Tabs.List className="inline-flex items-center gap-1 border-b border-cream-300 mb-4">
            <Tabs.Trigger value="global" className="px-4 py-2 text-sm font-medium text-steel data-[state=active]:text-navy data-[state=active]:border-b-2 data-[state=active]:border-navy transition-colors">
              Vue globale
            </Tabs.Trigger>
            <Tabs.Trigger value="historique" className="px-4 py-2 text-sm font-medium text-steel data-[state=active]:text-navy data-[state=active]:border-b-2 data-[state=active]:border-navy transition-colors">
              Historique
            </Tabs.Trigger>
            <Tabs.Trigger value="recherches" className="px-4 py-2 text-sm font-medium text-steel data-[state=active]:text-navy data-[state=active]:border-b-2 data-[state=active]:border-navy transition-colors">
              Recherches
            </Tabs.Trigger>
            <Tabs.Trigger value="ia" className="px-4 py-2 text-sm font-medium text-steel data-[state=active]:text-navy data-[state=active]:border-b-2 data-[state=active]:border-navy transition-colors">
              {'IA & Coûts'}
            </Tabs.Trigger>
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
                <StatCard title="Conv. Signup→Recherche" value={`${Math.round((adv.signupToFirstSearch?.conversionRate || 0) * 100)}%`} />
                <StatCard title="Échec recherches %" value={`${Math.round((adv.failuresAndLatency?.failureRate || 0) * 100)}%`} />
              </div>
            )}

            {/* Sector & Size distribution charts */}
            {(sectorData.length > 0 || sizeData.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sectorData.length > 0 && (
                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-sm text-steel mb-1">Répartition par secteur d'activité</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Pie data={sectorData} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}>
                              {sectorData.map((_: any, idx: number) => (
                                <Cell key={idx} fill={EXTENDED_COLORS[idx % EXTENDED_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {sizeData.length > 0 && (
                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-sm text-steel mb-1">Répartition par taille d'entreprise</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sizeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#547792" />
                            <YAxis stroke="#547792" />
                            <Tooltip />
                            <Bar dataKey="value" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card className="bg-white border-cream-300 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg text-navy">Toutes les recherches</CardTitle>
                  <SearchFiltersBar
                    {...filterProps}
                    onExportCsv={() => exportAdminSearchesCsv({ from: from || undefined, to: to || undefined, userId: userId ? Number(userId) : undefined })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {adv && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <Card className="border-cream-300">
                      <CardContent className="p-3">
                        <div className="text-sm text-steel mb-1">Recherches/jour (MA7)</div>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={searchesTs} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#547792" />
                              <YAxis tick={{ fontSize: 10 }} stroke="#547792" />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} dot={false} name="Recherches" />
                              <Line type="monotone" dataKey="ma7" stroke={CHART_COLORS.secondary} dot={false} name="MA7" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-cream-300">
                      <CardContent className="p-3">
                        <div className="text-sm text-steel mb-1">Paiements par méthode</div>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip />
                              <Legend />
                              <Pie data={paymentBreakdown} dataKey="value" nameKey="name" outerRadius={80} label>
                                {paymentBreakdown.map((_, idx) => (
                                  <Cell key={idx} fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent, CHART_COLORS.error][idx % 4]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-cream-300">
                      <CardContent className="p-3">
                        <div className="text-sm text-steel mb-1">Latence (ms) p50/p95/p99</div>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={latencyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                              <XAxis dataKey="name" stroke="#547792" />
                              <YAxis stroke="#547792" />
                              <Tooltip />
                              <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-steel border-b border-cream-300">
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
                      {(searches?.items || []).length === 0 ? (
                        <tr><td colSpan={8}><EmptyTable message="Aucune recherche trouvée" /></td></tr>
                      ) : (searches?.items || []).map((it: any) => (
                        <tr key={it.id} className="border-b border-cream-200 hover:bg-cream-50">
                          <td className="py-2 pr-2 text-navy">{it.id}</td>
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
              </CardContent>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="recherches" className="space-y-4">
            <Card className="bg-white border-cream-300 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg text-navy">Récapitulatif des recherches</CardTitle>
                  <SearchFiltersBar {...filterProps} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-steel border-b border-cream-300">
                        <th className="py-2 pr-2">Date</th>
                        <th className="py-2 pr-2">Utilisateur</th>
                        <th className="py-2 pr-2">Lien</th>
                        <th className="py-2 pr-2">Session</th>
                        <th className="py-2 pr-2">Téléchargement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searches?.items || []).length === 0 ? (
                        <tr><td colSpan={5}><EmptyTable /></td></tr>
                      ) : (searches?.items || []).map((it: any) => (
                        <tr key={it.id} className="border-b border-cream-200 hover:bg-cream-50">
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
                              <span className="text-steel">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button variant="outline" size="sm" className="bg-transparent border-cream-300" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Préc.
                  </Button>
                  <span className="text-sm text-steel">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="bg-transparent border-cream-300" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Suiv.
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="historique" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-3">
                  <div className="text-sm text-steel mb-1">Inscriptions/jour</div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={signupsTs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                        <XAxis dataKey="date" stroke="#547792" />
                        <YAxis stroke="#547792" />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-3">
                  <div className="text-sm text-steel mb-1">Sessions/jour</div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sessionsTs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                        <XAxis dataKey="date" stroke="#547792" />
                        <YAxis stroke="#547792" />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={CHART_COLORS.secondary} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-3">
                  <div className="text-sm text-steel mb-1">Paiements/jour</div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paidSessionsTs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                        <XAxis dataKey="date" stroke="#547792" />
                        <YAxis stroke="#547792" />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={CHART_COLORS.accent} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-cream-300 shadow-sm">
                <CardContent className="p-3">
                  <div className="text-sm text-steel mb-1">Recherches/jour (MA7)</div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={searchesTs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                        <XAxis dataKey="date" stroke="#547792" />
                        <YAxis stroke="#547792" />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} dot={false} />
                        <Line type="monotone" dataKey="ma7" stroke={CHART_COLORS.secondary} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Tabs.Content>

          <Tabs.Content value="ia" className="space-y-4">
            {!aiUsage ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Requêtes IA" value={aiUsage.summary?.total_requests ?? 0} />
                  <StatCard title="Coût API (USD)" value={`$${(aiUsage.summary?.total_cost_usd ?? 0).toFixed(4)}`} />
                  <StatCard title="Crédits facturés" value={(aiUsage.summary?.total_credits_charged ?? 0).toFixed(1)} />
                  <StatCard title="Marge brute" value={`${(aiUsage.profitability?.margin_percentage ?? 0).toFixed(1)}%`} />
                </div>

                {/* Charts: By Model & By Agent Type */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-sm text-steel mb-1">Requêtes par modèle IA</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Pie
                              data={Object.entries(aiUsage.summary?.by_model || {}).map(([name, d]: [string, any]) => ({ name, value: d.requests }))}
                              dataKey="value"
                              nameKey="name"
                              outerRadius={90}
                              label={{ fontSize: 10 }}
                            >
                              {Object.keys(aiUsage.summary?.by_model || {}).map((_: string, idx: number) => (
                                <Cell key={idx} fill={EXTENDED_COLORS[idx % EXTENDED_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-sm text-steel mb-1">{"Coût API par type d'agent"}</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(aiUsage.summary?.by_agent_type || {}).map(([name, d]: [string, any]) => ({ name, cost: parseFloat((d.cost_usd ?? 0).toFixed(4)), credits: d.credits_charged ?? 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#547792" />
                            <YAxis stroke="#547792" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cost" fill="#1A3263" name="Coût USD" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="credits" fill="#FAB95B" name="Crédits" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily cost timeseries */}
                {(aiUsage.summary?.by_day || []).length > 0 && (
                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="text-sm text-steel mb-1">Coût IA par jour</div>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={aiUsage.summary.by_day}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DB" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#547792" />
                            <YAxis stroke="#547792" />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="cost_usd" stroke="#1A3263" dot={false} name="Coût USD" />
                            <Line type="monotone" dataKey="credits_charged" stroke="#FAB95B" dot={false} name="Crédits" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Profitability Table */}
                {(aiUsage.profitability?.details || []).length > 0 && (
                  <Card className="bg-white border-cream-300 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-navy">{"Rentabilité par type d'agent"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-steel border-b border-cream-300">
                              <th className="py-2 pr-2">Type</th>
                              <th className="py-2 pr-2">Revenus (EUR)</th>
                              <th className="py-2 pr-2">Coût API (EUR)</th>
                              <th className="py-2 pr-2">Marge (EUR)</th>
                              <th className="py-2 pr-2">Marge %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(aiUsage.profitability?.details || []).map((d: any, i: number) => (
                              <tr key={i} className="border-b border-cream-200 hover:bg-cream-50">
                                <td className="py-2 pr-2 font-medium text-navy">{d.agent_type}</td>
                                <td className="py-2 pr-2">{(d.credits_revenue_eur ?? 0).toFixed(2)} EUR</td>
                                <td className="py-2 pr-2">{(d.api_cost_eur ?? 0).toFixed(4)} EUR</td>
                                <td className="py-2 pr-2 font-medium">{(d.margin_eur ?? 0).toFixed(2)} EUR</td>
                                <td className="py-2 pr-2">
                                  <Badge className={(d.margin_pct ?? 0) >= 50 ? 'bg-green-100 text-green-800' : (d.margin_pct ?? 0) >= 0 ? 'bg-gold text-navy' : 'bg-red-100 text-red-800'}>
                                    {(d.margin_pct ?? 0).toFixed(1)}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent AI Logs Table */}
                <Card className="bg-white border-cream-300 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-navy">Logs IA récents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-steel border-b border-cream-300">
                            <th className="py-2 pr-2">Date</th>
                            <th className="py-2 pr-2">Utilisateur</th>
                            <th className="py-2 pr-2">Modèle</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2">Tokens</th>
                            <th className="py-2 pr-2">Coût USD</th>
                            <th className="py-2 pr-2">Crédits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(aiUsage.recentLogs || []).length === 0 ? (
                            <tr><td colSpan={7}><EmptyTable message="Aucun log IA" /></td></tr>
                          ) : (aiUsage.recentLogs || []).map((log: any) => (
                            <tr key={log.id} className="border-b border-cream-200 hover:bg-cream-50">
                              <td className="py-2 pr-2 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : '\u2014'}</td>
                              <td className="py-2 pr-2">{log.user_email || log.user_id}</td>
                              <td className="py-2 pr-2 text-xs">{log.model}</td>
                              <td className="py-2 pr-2">{log.agent_type}</td>
                              <td className="py-2 pr-2">{(log.tokens_total ?? 0).toLocaleString()}</td>
                              <td className="py-2 pr-2">${parseFloat(log.cost_usd || 0).toFixed(4)}</td>
                              <td className="py-2 pr-2 font-medium">{parseFloat(log.credits_charged || 0).toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  );
};

export default AdminDashboard;
