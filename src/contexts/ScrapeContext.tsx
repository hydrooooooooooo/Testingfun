import React, { createContext, useContext } from 'react';
import { useScrape } from '@/hooks/useScrape';

// Définir le type pour la valeur du contexte, en se basant sur ce que retourne useScrape
type ScrapeContextType = ReturnType<typeof useScrape>;

// Créer le contexte avec une valeur par défaut undefined
const ScrapeContext = createContext<ScrapeContextType | undefined>(undefined);

// Créer le Provider
export const ScrapeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrapeLogic = useScrape();
  return (
    <ScrapeContext.Provider value={scrapeLogic}>
      {children}
    </ScrapeContext.Provider>
  );
};

// Créer un hook personnalisé pour utiliser le contexte facilement
export const useScrapeContext = () => {
  const context = useContext(ScrapeContext);
  if (context === undefined) {
    throw new Error('useScrapeContext must be used within a ScrapeProvider');
  }
  return context;
};
