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

// Interface for a single purchase, aligned with backend's `user_purchases` table
interface Purchase {
  id: number;
  user_id: number;
  session_id: string;
  pack_id: string;
  payment_intent_id: string;
  amount_paid: number;
  currency: string;
  download_url: string;
  purchased_at: string; // ISO date string
}

// Interface for the component's props
interface PaymentsTabProps {
  payments: Purchase[];
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
                payments.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.purchased_at), 'd MMM yyyy, HH:mm', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.pack_id.replace(/-/g, ' ')}
                    </TableCell>
                    <TableCell>{purchase.amount_paid.toFixed(2)} {purchase.currency.toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge variant={'default'}>
                        Réussi
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a href={purchase.download_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <FileDown className="mr-2 h-4 w-4" />
                          Télécharger
                        </Button>
                      </a>
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
