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

// Interface for a single payment
interface Payment {
  id: number;
  created_at: string;
  pack_name: string;
  amount: string;
  status: 'succeeded' | 'pending' | 'failed';
  stripe_payment_id: string;
}

// Interface for the component's props
interface PaymentsTabProps {
  payments: Payment[];
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ payments }) => {
  if (!payments) {
    return <div>Chargement des paiements...</div>;
  }

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
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), 'd MMM yyyy', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.pack_name || 'Achat de crédits'}
                    </TableCell>
                    <TableCell>{parseFloat(payment.amount).toFixed(2)}€</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'succeeded'
                            ? 'default' // 'success' variant might not exist, using 'default'
                            : 'secondary'
                        }
                      >
                        {payment.status === 'succeeded'
                          ? 'Réussi'
                          : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" disabled>
                        <FileDown className="mr-2 h-4 w-4" />
                        Facture
                      </Button>
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
