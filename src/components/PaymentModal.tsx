import React, { useState } from 'react';
import { X, CreditCard, Smartphone } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStripePay: (currency: 'eur' | 'mga') => void;
  onMvolaPay: () => Promise<void>;
  planName: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onStripePay, onMvolaPay, planName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<'eur' | 'mga'>('eur');

  const handleMvolaPayment = async () => {
    setIsLoading(true);
    try {
      await onMvolaPay();
    } catch (error) {
      console.error('Mvola payment error:', error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy">Sélectionnez votre paiement</h2>
          <button onClick={onClose} className="text-steel hover:text-navy transition-colors rounded-full p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-steel mb-6 text-center">
          Vous avez choisi le <span className="font-semibold text-navy">{planName}</span>.
        </p>

        {/* Currency toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-sm text-steel">Devise :</span>
          <div className="inline-flex rounded-lg border border-cream-200 overflow-hidden">
            <button
              onClick={() => setCurrency('eur')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currency === 'eur'
                  ? 'bg-navy text-white'
                  : 'bg-white text-steel hover:bg-cream-50'
              }`}
            >
              EUR
            </button>
            <button
              onClick={() => setCurrency('mga')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currency === 'mga'
                  ? 'bg-navy text-white'
                  : 'bg-white text-steel hover:bg-cream-50'
              }`}
            >
              MGA (Ariary)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Carte Bancaire */}
          <button
            onClick={() => onStripePay(currency)}
            className="w-full flex items-center justify-between p-5 rounded-lg bg-navy text-white hover:bg-navy/90 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-navy/30"
          >
            <div className="flex items-center gap-4">
              <CreditCard className="w-7 h-7" />
              <span className="text-lg font-semibold">Carte Bancaire</span>
            </div>
            <span className="text-sm font-light opacity-90">Stripe</span>
          </button>

          {/* Mvola */}
          <button
            onClick={handleMvolaPayment}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-5 rounded-lg bg-gold text-navy hover:bg-gold/90 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7" />
              <span className="text-lg font-semibold">{isLoading ? 'Traitement...' : 'MVola'}</span>
            </div>
            {!isLoading && <span className="text-sm font-light opacity-75">Mobile Money</span>}
          </button>

          {/* Orange Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-cream-200 text-navy cursor-default">
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7 text-gold" />
              <span className="text-lg font-semibold">Orange Money</span>
            </div>
            <span className="text-sm font-light text-steel">Bientôt</span>
          </button>

          {/* Airtel Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-cream-200 text-navy cursor-default">
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7 text-red-500" />
              <span className="text-lg font-semibold">Airtel Money</span>
            </div>
            <span className="text-sm font-light text-steel">Bientôt</span>
          </button>
        </div>

        <p className="text-xs text-steel mt-8 text-center">
          Les paiements par mobile money seront bientôt disponibles pour une expérience encore plus rapide.
        </p>
      </div>
    </div>
  );
};

export default PaymentModal;
