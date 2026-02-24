import React, { useState } from 'react';
import { X, CreditCard, Smartphone } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStripePay: () => void;
  onMvolaPay: () => Promise<void>; // Ajout de la prop pour le paiement Mvola
  planName: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onStripePay, onMvolaPay, planName }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleMvolaPayment = async () => {
    setIsLoading(true);
    try {
      await onMvolaPay();
    } catch (error) {
      console.error('Mvola payment error:', error);
    } finally {
      setIsLoading(false);
      onClose(); // Fermer la modale après la tentative
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy">Sélectionnez votre paiement</h2>
          <button onClick={onClose} className="text-steel-200 hover:text-steel transition-colors rounded-full p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-steel mb-8 text-center">
          Vous avez choisi le <span className="font-semibold text-navy">{planName}</span>.
        </p>

        <div className="space-y-4">
          {/* Carte Bancaire */}
          <button 
            onClick={onStripePay}
            className="w-full flex items-center justify-between p-5 rounded-lg bg-navy text-white hover:bg-navy-400 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-navy-300"
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
            className="w-full flex items-center justify-between p-5 rounded-lg bg-yellow-400 text-white hover:bg-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:bg-steel-200 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7" />
              <span className="text-lg font-semibold">{isLoading ? 'Traitement...' : 'MVola'}</span>
            </div>
            {!isLoading && <span className="text-sm font-light opacity-90">Mobile Money</span>}
          </button>

          {/* Orange Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-cream-100 text-navy hover:bg-cream-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cream-300">
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7 text-gold-500" />
              <span className="text-lg font-semibold">Orange Money</span>
            </div>
            <span className="text-sm font-light text-steel">Bientôt</span>
          </button>

          {/* Airtel Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-cream-100 text-navy hover:bg-cream-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cream-300">
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
