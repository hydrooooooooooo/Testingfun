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
      // Gérer le succès ici (par exemple, afficher une notification)
      alert('Paiement MVola initié avec succès !');
    } catch (error) {
      // Gérer l'erreur ici (par exemple, afficher une notification d'erreur)
      alert('Erreur lors du paiement MVola.');
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
          <h2 className="text-2xl font-bold text-gray-900">Sélectionnez votre paiement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-8 text-center">
          Vous avez choisi le <span className="font-semibold text-blue-600">{planName}</span>.
        </p>

        <div className="space-y-4">
          {/* Carte Bancaire */}
          <button 
            onClick={onStripePay}
            className="w-full flex items-center justify-between p-5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
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
            className="w-full flex items-center justify-between p-5 rounded-lg bg-yellow-400 text-white hover:bg-yellow-500 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7" />
              <span className="text-lg font-semibold">{isLoading ? 'Traitement...' : 'MVola'}</span>
            </div>
            {!isLoading && <span className="text-sm font-light opacity-90">Mobile Money</span>}
          </button>

          {/* Orange Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300">
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7 text-orange-500" />
              <span className="text-lg font-semibold">Orange Money</span>
            </div>
            <span className="text-sm font-light text-gray-500">Bientôt</span>
          </button>

          {/* Airtel Money */}
          <button className="w-full flex items-center justify-between p-5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300">
            <div className="flex items-center gap-4">
              <Smartphone className="w-7 h-7 text-red-500" />
              <span className="text-lg font-semibold">Airtel Money</span>
            </div>
            <span className="text-sm font-light text-gray-500">Bientôt</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-8 text-center">
          Les paiements par mobile money seront bientôt disponibles pour une expérience encore plus rapide.
        </p>
      </div>
    </div>
  );
};

export default PaymentModal;
