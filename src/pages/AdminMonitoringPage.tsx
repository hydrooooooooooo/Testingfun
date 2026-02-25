import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Wifi, WifiOff, Pause, Play, RefreshCw, Server, Cpu, Clock, Database, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/useApi';

// ── Helpers ──────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const color = value > 85 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className={`w-full h-2 bg-cream-200 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ── Types ────────────────────────────────────────────────

interface MonitoringData {
  server: {
    ram: { processRss: number; heapUsed: number; heapTotal: number; systemUsed: number; systemTotal: number; systemFree: number; systemPercent: number };
    cpu: { load1: number; load5: number; load15: number; cores: number; loadPercent: number };
    uptime: { process: number; system: number };
    node: { version: string; platform: string; arch: string; pid: number };
  };
  activeSessions: {
    total: number;
    byType: Record<string, number>;
    sessions: Array<{ id: string; status: string; service_type: string; totalItems: number; created_at: string; updated_at: string; user_email: string }>;
  };
  connectedUsers: {
    count: number;
    users: Array<{ userId: number; email: string; lastSeen: string; currentPath: string }>;
  };
  dbPool: { numUsed: number; numFree: number; numPendingAcquires: number } | null;
  recentEvents: Array<{ event_type: string; id: number; detail: string; service_type: string; created_at: string; user_email: string }>;
  timestamp: string;
}

// ── Component ────────────────────────────────────────────

const AdminMonitoringPage: React.FC = () => {
  const { getAdminMonitoring } = useApi();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [connectionOk, setConnectionOk] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const result = await getAdminMonitoring();
    if (result) {
      setData(result);
      setConnectionOk(true);
      setLastRefresh(new Date());
    } else {
      setConnectionOk(false);
    }
    setLoading(false);
  }, [getAdminMonitoring]);

  // Initial load + polling
  useEffect(() => {
    fetchData();

    if (!paused) {
      intervalRef.current = setInterval(fetchData, 5000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, fetchData]);

  const togglePause = () => setPaused((p) => !p);

  const handleRefresh = () => {
    fetchData();
  };

  if (loading && !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-navy animate-pulse" />
          <h1 className="text-2xl font-bold text-navy">Monitoring</h1>
        </div>
        <div className="text-steel">Chargement des métriques...</div>
      </div>
    );
  }

  const { server, activeSessions, connectedUsers, dbPool, recentEvents } = data || {} as MonitoringData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-navy" />
          <h1 className="text-2xl font-bold text-navy">Monitoring</h1>
          <Badge variant="outline" className={`bg-transparent gap-1.5 ${connectionOk ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
            {connectionOk ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connectionOk ? 'Connecté' : 'Déconnecté'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePause} className="bg-transparent gap-1.5">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Reprendre' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="bg-transparent gap-1.5">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {lastRefresh && (
            <span className="text-xs text-steel">
              Mis à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {/* Live indicator */}
      {!paused && (
        <div className="flex items-center gap-2 text-sm text-steel">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          Actualisation auto toutes les 5s
        </div>
      )}

      {/* 4 Health Cards */}
      {server && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* RAM */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-steel flex items-center gap-2">
                <Server className="h-4 w-4" />
                RAM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{server.ram.systemPercent}%</div>
              <ProgressBar value={server.ram.systemPercent} className="mt-2" />
              <div className="mt-2 space-y-0.5 text-xs text-steel">
                <div>Système: {formatBytes(server.ram.systemUsed)} / {formatBytes(server.ram.systemTotal)}</div>
                <div>Process RSS: {formatBytes(server.ram.processRss)}</div>
              </div>
            </CardContent>
          </Card>

          {/* CPU */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-steel flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{server.cpu.loadPercent}%</div>
              <ProgressBar value={server.cpu.loadPercent} className="mt-2" />
              <div className="mt-2 space-y-0.5 text-xs text-steel">
                <div>Load: {server.cpu.load1.toFixed(2)} / {server.cpu.load5.toFixed(2)} / {server.cpu.load15.toFixed(2)}</div>
                <div>{server.cpu.cores} cores</div>
              </div>
            </CardContent>
          </Card>

          {/* Uptime */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-steel flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{formatUptime(server.uptime.process)}</div>
              <div className="mt-2 space-y-0.5 text-xs text-steel">
                <div>Process: {formatUptime(server.uptime.process)}</div>
                <div>Système: {formatUptime(server.uptime.system)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Server Info */}
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-steel flex items-center gap-2">
                <Database className="h-4 w-4" />
                Serveur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{server.node.version}</div>
              <div className="mt-2 space-y-0.5 text-xs text-steel">
                <div>{server.node.platform}/{server.node.arch} — PID {server.node.pid}</div>
                {dbPool && (
                  <div>DB Pool: {dbPool.numUsed ?? '?'} used / {dbPool.numFree ?? '?'} free / {dbPool.numPendingAcquires ?? '?'} pending</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions && (
        <Card className="bg-white border-cream-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Sessions actives
              <Badge variant="outline" className="bg-transparent ml-2">{activeSessions.total}</Badge>
              {Object.entries(activeSessions.byType).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">{type}: {count}</Badge>
              ))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.sessions.length === 0 ? (
              <div className="text-sm text-steel py-4 text-center">Aucune session active</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 text-steel">
                      <th className="text-left py-2 pr-4 font-medium">ID</th>
                      <th className="text-left py-2 pr-4 font-medium">Status</th>
                      <th className="text-left py-2 pr-4 font-medium">Type</th>
                      <th className="text-left py-2 pr-4 font-medium">Utilisateur</th>
                      <th className="text-right py-2 pr-4 font-medium">Items</th>
                      <th className="text-right py-2 font-medium">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.sessions.map((s) => {
                      const duration = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 1000);
                      return (
                        <tr key={s.id} className="border-b border-cream-200 last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs">{s.id}</td>
                          <td className="py-2 pr-4">
                            <Badge className={s.status === 'running' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-steel">{s.service_type || '—'}</td>
                          <td className="py-2 pr-4 text-steel">{s.user_email || '—'}</td>
                          <td className="py-2 pr-4 text-right">{s.totalItems ?? 0}</td>
                          <td className="py-2 text-right text-steel">{formatUptime(duration)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-column: Connected Users + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connected Users */}
        {connectedUsers && (
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilisateurs connectés
                <Badge variant="outline" className="bg-transparent ml-2">{connectedUsers.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectedUsers.users.length === 0 ? (
                <div className="text-sm text-steel py-4 text-center">Aucun utilisateur actif</div>
              ) : (
                <div className="space-y-3">
                  {connectedUsers.users.map((u) => (
                    <div key={u.userId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy truncate">{u.email}</div>
                        <div className="text-xs text-steel">{u.currentPath}</div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">En ligne</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Events */}
        {recentEvents && (
          <Card className="bg-white border-cream-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Événements récents (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <div className="text-sm text-steel py-4 text-center">Aucun événement récent</div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {recentEvents.map((e, i) => (
                    <div key={`${e.event_type}-${e.id}-${i}`} className="flex items-center gap-3 py-1.5 border-b border-cream-200 last:border-0">
                      <Badge className={e.event_type === 'session'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs'
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs'
                      }>
                        {e.event_type === 'session' ? 'Session' : 'Crédit'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-navy">{e.detail}</span>
                        {e.user_email && <span className="text-xs text-steel ml-2">— {e.user_email}</span>}
                      </div>
                      <span className="text-xs text-steel whitespace-nowrap">{timeAgo(e.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminMonitoringPage;
