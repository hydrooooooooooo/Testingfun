import React, { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Search, Coins, ShieldOff, ShieldCheck } from 'lucide-react';
import { BUSINESS_SECTORS, COMPANY_SIZES } from '@/constants/userProfile';

const AdminUsersPage: React.FC = () => {
  const { searchAdminUsers, getAdminUserById, adjustAdminUserCredits, toggleAdminUserStatus } = useApi();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Sheet detail
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Credit adjust dialog
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  const fetchUsers = useCallback(async (q: string) => {
    setLoadingList(true);
    try {
      const rows = await searchAdminUsers(q, 50);
      setUsers(rows);
    } catch {
      // handled
    } finally {
      setLoadingList(false);
    }
  }, [searchAdminUsers]);

  useEffect(() => {
    fetchUsers('');
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers(query);
  };

  const openUserDetail = async (userId: number) => {
    setSheetOpen(true);
    setUserDetail(null);
    try {
      const data = await getAdminUserById(userId);
      setUserDetail(data);
      setSelectedUser(data.user);
    } catch {
      // handled
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || !creditAmount || !creditReason) return;
    setCreditLoading(true);
    try {
      await adjustAdminUserCredits(selectedUser.id, parseFloat(creditAmount), creditReason);
      setCreditDialogOpen(false);
      setCreditAmount('');
      setCreditReason('');
      // Refresh detail
      const data = await getAdminUserById(selectedUser.id);
      setUserDetail(data);
      setSelectedUser(data.user);
      fetchUsers(query);
    } catch {
      // handled
    } finally {
      setCreditLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    setSuspendLoading(true);
    try {
      const newSuspended = !selectedUser.is_suspended;
      await toggleAdminUserStatus(selectedUser.id, newSuspended, suspendReason || undefined);
      setSuspendDialogOpen(false);
      setSuspendReason('');
      // Refresh
      const data = await getAdminUserById(selectedUser.id);
      setUserDetail(data);
      setSelectedUser(data.user);
      fetchUsers(query);
    } catch {
      // handled
    } finally {
      setSuspendLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-navy" />
        <h2 className="text-2xl font-semibold text-navy">Utilisateurs</h2>
      </div>

      <Card className="bg-white border-cream-300 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Rechercher par email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm bg-white border-cream-300"
            />
            <Button onClick={handleSearch} variant="outline" className="bg-transparent border-cream-300">
              <Search className="h-4 w-4 mr-1" /> Rechercher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-steel">Aucun utilisateur trouvé</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel border-b border-cream-300">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Email</th>
                    <th className="py-2 pr-2">Nom</th>
                    <th className="py-2 pr-2">Rôle</th>
                    <th className="py-2 pr-2">Secteur</th>
                    <th className="py-2 pr-2">Taille</th>
                    <th className="py-2 pr-2">Crédits</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 pr-2">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr
                      key={u.id}
                      className="border-b border-cream-200 hover:bg-cream-50 cursor-pointer"
                      onClick={() => openUserDetail(u.id)}
                    >
                      <td className="py-2 pr-2 text-navy font-medium">{u.id}</td>
                      <td className="py-2 pr-2">{u.email}</td>
                      <td className="py-2 pr-2">{u.name || '—'}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-navy text-white' : ''}>
                          {u.role || 'user'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-xs">{BUSINESS_SECTORS.find((s) => s.value === u.business_sector)?.label || '—'}</td>
                      <td className="py-2 pr-2 text-xs">{COMPANY_SIZES.find((s) => s.value === u.company_size)?.label || '—'}</td>
                      <td className="py-2 pr-2 font-medium">{parseFloat(u.credits_balance || 0).toFixed(1)}</td>
                      <td className="py-2 pr-2">
                        {u.is_suspended ? (
                          <Badge variant="destructive">Suspendu</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-navy">Détail utilisateur</SheetTitle>
          </SheetHeader>
          {!userDetail ? (
            <div className="space-y-3 mt-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-steel">ID</div>
                <div className="font-medium">{selectedUser?.id}</div>
                <div className="text-steel">Email</div>
                <div className="font-medium">{selectedUser?.email}</div>
                <div className="text-steel">Nom</div>
                <div className="font-medium">{selectedUser?.name || '—'}</div>
                <div className="text-steel">Rôle</div>
                <div className="font-medium">{selectedUser?.role || 'user'}</div>
                <div className="text-steel">Crédits</div>
                <div className="font-medium text-navy">{parseFloat(selectedUser?.credits_balance || 0).toFixed(1)}</div>
                <div className="text-steel">Secteur</div>
                <div className="font-medium">{BUSINESS_SECTORS.find((s) => s.value === selectedUser?.business_sector)?.label || '—'}</div>
                <div className="text-steel">Taille</div>
                <div className="font-medium">{COMPANY_SIZES.find((s) => s.value === selectedUser?.company_size)?.label || '—'}</div>
                <div className="text-steel">Email vérifié</div>
                <div className="font-medium">{selectedUser?.email_verified_at ? 'Oui' : 'Non'}</div>
                <div className="text-steel">Sessions</div>
                <div className="font-medium">{userDetail?.sessionCount ?? 0}</div>
                <div className="text-steel">Statut</div>
                <div>
                  {selectedUser?.is_suspended ? (
                    <Badge variant="destructive">Suspendu</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>
                  )}
                </div>
              </div>

              {selectedUser?.suspension_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <strong>Raison suspension:</strong> {selectedUser.suspension_reason}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setCreditDialogOpen(true)} className="bg-navy text-white hover:bg-navy/90">
                  <Coins className="h-4 w-4 mr-1" /> Ajuster crédits
                </Button>
                <Button
                  size="sm"
                  variant={selectedUser?.is_suspended ? 'default' : 'destructive'}
                  onClick={() => setSuspendDialogOpen(true)}
                  className={selectedUser?.is_suspended ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                >
                  {selectedUser?.is_suspended ? (
                    <><ShieldCheck className="h-4 w-4 mr-1" /> Réactiver</>
                  ) : (
                    <><ShieldOff className="h-4 w-4 mr-1" /> Suspendre</>
                  )}
                </Button>
              </div>

              {/* Transactions */}
              <div>
                <h4 className="text-sm font-semibold text-navy mb-2">Dernières transactions</h4>
                {(userDetail?.transactions || []).length === 0 ? (
                  <div className="text-sm text-steel">Aucune transaction</div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {(userDetail?.transactions || []).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs border-b border-cream-200 py-1.5">
                        <div>
                          <span className={tx.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {tx.amount >= 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(1)}
                          </span>
                          <span className="ml-2 text-steel">{tx.transaction_type}</span>
                        </div>
                        <div className="text-steel">{new Date(tx.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Credit Adjust Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster les crédits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Montant (positif = ajouter, négatif = retirer)</Label>
              <Input
                type="number"
                step="0.5"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Ex: 10 ou -5"
              />
            </div>
            <div>
              <Label>Raison</Label>
              <Textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Raison de l'ajustement..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAdjustCredits} disabled={creditLoading || !creditAmount || !creditReason} className="bg-navy text-white hover:bg-navy/90">
              {creditLoading ? 'En cours...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend AlertDialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_suspended ? 'Réactiver cet utilisateur ?' : 'Suspendre cet utilisateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_suspended
                ? "L'utilisateur pourra se reconnecter et utiliser la plateforme."
                : "L'utilisateur ne pourra plus se connecter ni utiliser ses crédits."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!selectedUser?.is_suspended && (
            <div>
              <Label>Raison (optionnel)</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Raison de la suspension..."
                rows={2}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleSuspend} disabled={suspendLoading}>
              {suspendLoading ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersPage;
