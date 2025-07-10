export interface Payment {
  id: number;
  userId: number;
  sessionId: string;
  packId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethod?: string;
  createdAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  metadata?: any;
}

export interface PaymentSummary {
  totalSpent: number;
  totalTransactions: number;
  successfulPayments: number;
  lastPaymentDate?: Date;
  averageOrderValue: number;
}
