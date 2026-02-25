import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, RefreshCw, Archive, Undo2, Activity } from 'lucide-react';

const statusColors: Record<string, string> = {
  FINISHED: 'bg-green-100 text-green-800 border-green-200',
  RUNNING: 'bg-blue-100 text-blue-800 border-blue-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const AdminSessionsPage: React.FC = () => {
  const { getAdminSessions, getAdminSessionById, refundAdminSession, archiveAdminSession, getAdminActiveSessionsCount } = useApi();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeCounts, setActiveCounts] = useState<{ pending: number; running: number; total: number } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<any>(null);

  // Refund dialog
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundSessionId, setRefundSessionId] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  // Archive dialog
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveSessionId, setArchiveSessionId] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getAdminSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      // handled
    } finally {
      setLoadingList(false);
    }
  }, [getAdminSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Poll active sessions count every 10s
  useEffect(() => {
    const fetchActive = async () => {
      const data = await getAdminActiveSessionsCount();
      setActiveCounts(data);
    };
    fetchActive();
    const interval = setInterval(fetchActive, 10000);
    return () => clearInterval(interval);
  }, [getAdminActiveSessionsCount]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (userFilter && !String(s.user).toLowerCase().includes(userFilter.toLowerCase())) return false;
      if (dateFrom) {
        const sessionDate = new Date(s.created_at).toISOString().slice(0, 10);
        if (sessionDate < dateFrom) return false;
      }
      return true;
    });
  }, [sessions, statusFilter, userFilter, dateFrom]);

  const openSessionDetail = async (sessionId: string) => {
    setSheetOpen(true);
    setSessionDetail(null);
    try {
      const data = await getAdminSessionById(sessionId);
      setSessionDetail(data);
    } catch {
      // handled
    }
  };

  const handleRefund = async () => {
    if (!refundSessionId) return;
    setRefundLoading(true);
    try {
      await refundAdminSession(refundSessionId);
      setRefundDialogOpen(false);
      setRefundSessionId(null);
      fetchSessions();
    } catch {
      // handled
    } finally {
      setRefundLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveSessionId) return;
    setArchiveLoading(true);
    try {
      await archiveAdminSession(archiveSessionId);
      setArchiveDialogOpen(false);
      setArchiveSessionId(null);
      fetchSessions();
      if (sheetOpen) setSheetOpen(false);
    } catch {
      // handled
    } finally {
      setArchiveLoading(false);
    }
  };

  const uniqueStatuses = useMemo(() => {
    const set = new Set(sessions.map((s: any) => s.status));
    return Array.from(set).sort();
  }, [sessions]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-7 w-7 text-navy" />
        <h2 className="text-2xl font-semibold text-navy">Sessions</h2>
        <Button variant="outline" size="sm" className="ml-auto bg-transparent border-cream-300" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
        </Button>
      </div>

      {/* Active sessions banner */}
      {activeCounts && activeCounts.total > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Sessions actives</span>
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending: {activeCounts.pending}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Running: {activeCounts.running}
          </Badge>
          <Badge className="bg-navy text-white">
            Total: {activeCounts.total}
          </Badge>
        </div>
      )}

      <Card className="bg-white border-cream-300 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 bg-white border-cream-300">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrer par user ID..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-48 h-8 bg-white border-cream-300"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40 h-8 bg-white border-cream-300"
            />
            {(statusFilter !== 'all' || userFilter || dateFrom) && (
              <Button variant="outline" size="sm" className="h-8 bg-transparent border-cream-300" onClick={() => { setStatusFilter('all'); setUserFilter(''); setDateFrom(''); }}>
                Effacer filtres
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-steel">Aucune session trouvée</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel border-b border-cream-300">
                    <th className="py-2 pr-2">ID</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 pr-2">User</th>
                    <th className="py-2 pr-2">Pack</th>
                    <th className="py-2 pr-2">Items</th>
                    <th className="py-2 pr-2">Payé</th>
                    <th className="py-2 pr-2">Créé le</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s: any) => (
                    <tr key={s.id} className="border-b border-cream-200 hover:bg-cream-50">
                      <td
                        className="py-2 pr-2 text-navy font-medium cursor-pointer hover:underline"
                        onClick={() => openSessionDetail(s.id)}
                      >
                        {s.id?.length > 20 ? s.id.slice(0, 20) + '...' : s.id}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge className={statusColors[s.status] || 'bg-gray-100 text-gray-800'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2">{s.user || '—'}</td>
                      <td className="py-2 pr-2">{s.packId || '—'}</td>
                      <td className="py-2 pr-2">{s.totalItems ?? 0}</td>
                      <td className="py-2 pr-2">
                        {s.isPaid ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Oui</Badge>
                        ) : (
                          <span className="text-steel">Non</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs bg-transparent border-cream-300"
                            onClick={(e) => { e.stopPropagation(); setRefundSessionId(s.id); setRefundDialogOpen(true); }}
                          >
                            <Undo2 className="h-3 w-3 mr-1" /> Rembourser
                          </Button>
                          {s.status !== 'ARCHIVED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-transparent border-cream-300"
                              onClick={(e) => { e.stopPropagation(); setArchiveSessionId(s.id); setArchiveDialogOpen(true); }}
                            >
                              <Archive className="h-3 w-3 mr-1" /> Archiver
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-navy">Détail session</SheetTitle>
          </SheetHeader>
          {!sessionDetail ? (
            <div className="space-y-3 mt-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-steel">ID</div>
                <div className="font-medium font-mono text-xs break-all">{sessionDetail.id}</div>
                <div className="text-steel">Statut</div>
                <div><Badge className={statusColors[sessionDetail.status] || ''}>{sessionDetail.status}</Badge></div>
                <div className="text-steel">User ID</div>
                <div className="font-medium">{sessionDetail.user_id || '—'}</div>
                <div className="text-steel">Pack</div>
                <div className="font-medium">{sessionDetail.packId || '—'}</div>
                <div className="text-steel">Items</div>
                <div className="font-medium">{sessionDetail.totalItems ?? 0}</div>
                <div className="text-steel">Payé</div>
                <div className="font-medium">{sessionDetail.isPaid ? 'Oui' : 'Non'}</div>
                <div className="text-steel">Méthode paiement</div>
                <div className="font-medium">{sessionDetail.payment_method || '—'}</div>
                <div className="text-steel">Créé le</div>
                <div className="font-medium">{sessionDetail.created_at ? new Date(sessionDetail.created_at).toLocaleString() : '—'}</div>
                <div className="text-steel">Mis à jour</div>
                <div className="font-medium">{sessionDetail.updated_at ? new Date(sessionDetail.updated_at).toLocaleString() : '—'}</div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent border-cream-300"
                  onClick={() => { setRefundSessionId(sessionDetail.id); setRefundDialogOpen(true); }}
                >
                  <Undo2 className="h-4 w-4 mr-1" /> Rembourser
                </Button>
                {sessionDetail.status !== 'ARCHIVED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-cream-300"
                    onClick={() => { setArchiveSessionId(sessionDetail.id); setArchiveDialogOpen(true); }}
                  >
                    <Archive className="h-4 w-4 mr-1" /> Archiver
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Refund AlertDialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rembourser cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les crédits utilisés pour cette session seront remboursés à l'utilisateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={refundLoading}>
              {refundLoading ? 'En cours...' : 'Rembourser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive AlertDialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              La session sera marquée comme archivée. Cette action est réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiveLoading}>
              {archiveLoading ? 'En cours...' : 'Archiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSessionsPage;
