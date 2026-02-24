import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { Purchase } from '@/types';

interface PaymentsTabProps {
  payments: Purchase[];
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ payments }) => {
  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'completed':
        return 'default';
      case 'failed':
      case 'refused':
      case 'error':
      case 'canceled':
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'completed':
        return 'Réussi';
      case 'failed':
      case 'refused':
      case 'error':
        return 'Échoué';
      case 'pending':
        return 'En attente';
      case 'canceled':
      case 'cancelled':
        return 'Annulé';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusClass = (status: string): string => {
    const s = status.toLowerCase();
    if (s === 'succeeded' || s === 'completed') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (['failed', 'refused', 'error', 'canceled', 'cancelled'].includes(s)) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-cream-100 text-navy border-cream-300';
  };
  if (!payments) {
    return <div>Chargement des paiements...</div>;
  }

  const formatAmountFR = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  return (
    <div className="space-y-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>
            Consultez la liste de toutes vos transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length > 0 ? (
                payments.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.created_at), 'd MMM yyyy, HH:mm', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.description}
                    </TableCell>
                    <TableCell>
                      {formatAmountFR(purchase.amount)} {purchase.currency?.toUpperCase?.() || 'MGA'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusClass(purchase.status)}>
                        {getStatusText(purchase.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* TODO: Re-implement download logic. The download URL is not available directly on the payment object anymore. */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Aucun paiement trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};


export default PaymentsTab;
