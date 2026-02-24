import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PaymentsPage: React.FC = () => {
  const { userData, error, isLoading } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-cream-50">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center">
            <AlertCircle className="mr-2" />
            Erreur
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return <div className="container mx-auto p-4">Aucune donnée disponible.</div>;
  }

  const { payments = [] } = userData;

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      String(payment.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      payment.amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0);
  const succeededCount = payments.filter(p => p.status === 'succeeded').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;

  const formatAmountFR = (amount: number, currency: string = 'MGA') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency.toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; label: string; className: string }> = {
      'succeeded': { icon: CheckCircle, label: 'Réussi', className: 'bg-green-50 text-green-700 border-green-200' },
      'pending': { icon: Clock, label: 'En attente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'failed': { icon: XCircle, label: 'Échoué', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const config = statusConfig[status] || statusConfig['pending'];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'card': 'Carte bancaire', 'stripe': 'Stripe', 'mvola': 'MVola', 'mobile_money': 'Mobile Money',
    };
    return methods[method] || method;
  };

  return (
    <div className="h-full bg-cream-50 p-4 sm:p-6 space-y-4 sm:space-y-6 pt-12 md:pt-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Historique des Paiements</h1>
        <p className="text-steel mt-1">Historique complet de vos transactions</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-700">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-steel" />
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmountFR(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Montant total payé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Réussis</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{succeededCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Paiements confirmés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">En cours de traitement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Échoués</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Paiements refusés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ID, montant ou description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="succeeded">Réussi</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique des transactions</span>
            <Badge variant="secondary">
              {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement trouvé</p>
              <p className="text-sm mt-2">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Essayez de modifier vos filtres' 
                  : 'Vous n\'avez pas encore effectué de paiement'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaction</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Moyen de paiement</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {String(payment.id).substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(payment.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatAmountFR(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {getPaymentMethodLabel(payment.payment_method || 'card')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {payment.description || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;
