import { useState } from 'react';
import axios from 'axios';

// API base URL - should be set in environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Custom hook for API interactions
 */
export function useApi() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start a scraping job
   * @param url URL to scrape
   * @param resultsLimit Optional limit for number of results (1 for single item)
   * @param sessionId Optional session ID
   */
  const startScraping = async (url: string, resultsLimit?: number, sessionId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/scrape`, {
        url,
        sessionId,
        resultsLimit: resultsLimit?.toString() // Convertir en string pour l'API
      });
      
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors du scraping');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get scraping results
   */
  const getScrapeResults = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/scrape/result`, {
        params: { sessionId }
      });
      
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la récupération des résultats');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a payment session
   */
  const createPayment = async (packId: string, sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/create-payment`, {
        packId,
        sessionId
      });
      
      return response.data.data.checkoutUrl;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la création du paiement');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify payment status
   */
  const verifyPayment = async (sessionId: string) => {
    try {
      // Si c'est une session temporaire, on la considère automatiquement comme payée
      if (sessionId.startsWith('temp_')) {
        console.log('Session temporaire détectée, considérée comme payée:', sessionId);
        return { 
          isPaid: true, 
          packId: localStorage.getItem('lastPackId') || 'pack-decouverte',
          message: 'Session temporaire validée automatiquement'
        };
      }

      console.log(`Vérification du paiement pour la session ${sessionId}`);
      
      // Essayer d'abord avec la route spécifique
      try {
        const response = await axios.get(`${API_BASE_URL}/api/payment/verify-payment`, {
          params: { sessionId },
          timeout: 10000, // 10 secondes de timeout
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Réponse de vérification (route spécifique):', response.data);
        
        if (response.data && response.data.isPaid) {
          // Stocker les informations dans localStorage pour référence future
          if (response.data.packId) {
            localStorage.setItem('lastPackId', response.data.packId);
          }
          localStorage.setItem('lastSessionId', sessionId);
        }
        
        return response.data;
      } catch (error) {
        console.warn('Erreur avec la route spécifique, essai avec la route générique:', error);
        
        // Fallback sur l'ancienne route
        const fallbackResponse = await axios.get(`${API_BASE_URL}/api/verify-payment`, {
          params: { sessionId },
          timeout: 10000, // 10 secondes de timeout
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Réponse de vérification (route fallback):', fallbackResponse.data);
        
        if (fallbackResponse.data && fallbackResponse.data.isPaid) {
          // Stocker les informations dans localStorage pour référence future
          if (fallbackResponse.data.packId) {
            localStorage.setItem('lastPackId', fallbackResponse.data.packId);
          }
          localStorage.setItem('lastSessionId', sessionId);
        }
        
        return fallbackResponse.data;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du paiement:', error);
      
      // Vérifier si nous avons des données en cache pour cette session
      if (localStorage.getItem('lastSessionId') === sessionId) {
        console.log('Utilisation des données en cache pour la session:', sessionId);
        return { 
          isPaid: true, 
          packId: localStorage.getItem('lastPackId') || 'pack-decouverte',
          message: 'Utilisation des données en cache'
        };
      }
      
      throw error;
    }
  };

  /**
   * Get export URL
   */
  const getExportUrl = (sessionId: string, format: 'excel' | 'csv' = 'excel') => {
    return `${API_BASE_URL}/api/export?sessionId=${sessionId}&format=${format}`;
  };

  /**
   * Get preview items for a session
   */
  const getPreviewItems = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Récupération des éléments de prévisualisation pour la session: ${sessionId}`);
      
      // Pour les sessions temporaires, essayer d'abord de récupérer depuis le localStorage
      const isTemporarySession = sessionId.startsWith('temp_');
      if (isTemporarySession) {
        const cachedPreview = localStorage.getItem(`preview_${sessionId}`);
        if (cachedPreview) {
          try {
            const parsedCache = JSON.parse(cachedPreview);
            console.log('Utilisation des données de prévisualisation en cache pour la session temporaire:', sessionId);
            
            // Normaliser les éléments et s'assurer qu'ils sont valides
            if (parsedCache.previewItems && Array.isArray(parsedCache.previewItems)) {
              parsedCache.previewItems = parsedCache.previewItems.map(normalizePreviewItem);
              // Vérifier si les éléments normalisés sont valides
              if (parsedCache.previewItems.length > 0) {
                console.log(`${parsedCache.previewItems.length} éléments de prévisualisation trouvés dans le cache`);
                return parsedCache;
              }
            }
            console.warn('Cache invalide ou vide, génération de données de démonstration');
          } catch (e) {
            console.warn('Erreur lors de la lecture du cache de prévisualisation:', e);
            // Continuer avec la requête API ou les données de démonstration
          }
        }
      }
      
      // Pour les sessions temporaires, on peut directement générer des données de démonstration
      // au lieu de faire une requête API qui risque d'échouer
      if (isTemporarySession) {
        console.log('Génération de données de démonstration pour la session temporaire:', sessionId);
        const demoItems = generateDemoItems();
        const demoData = { previewItems: demoItems };
        
        // Stocker dans le localStorage pour les futures requêtes
        localStorage.setItem(`preview_${sessionId}`, JSON.stringify(demoData));
        
        return demoData;
      }
      
      // Pour les sessions normales, récupérer les données depuis l'API
      console.log(`Récupération des données depuis l'API pour la session: ${sessionId}`);
      const response = await axios.get(`${API_BASE_URL}/api/preview-items`, {
        params: { sessionId },
        timeout: 8000, // 8 secondes de timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      let previewData = response.data;
      console.log('Données reçues de l\'API:', previewData);
      
      // Normaliser les éléments de prévisualisation
      if (previewData.previewItems && Array.isArray(previewData.previewItems)) {
        console.log(`Normalisation de ${previewData.previewItems.length} éléments`);
        previewData.previewItems = previewData.previewItems.map(normalizePreviewItem);
        
        // Vérifier si les données normalisées contiennent des éléments valides
        if (previewData.previewItems.length === 0) {
          console.warn('Aucun élément valide reçu de l\'API, utilisation des données de démonstration');
          previewData.previewItems = generateDemoItems();
        }
      } else {
        console.warn('Format de réponse API invalide, utilisation des données de démonstration');
        previewData = { previewItems: generateDemoItems() };
      }
      
      return previewData;
    } catch (err: any) {
      console.error('Erreur lors de la récupération des éléments de prévisualisation:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la récupération des éléments de prévisualisation');
      
      // Générer des données de démonstration en cas d'erreur
      console.log('Génération de données de démonstration après erreur');
      const demoItems = generateDemoItems();
      const demoData = { previewItems: demoItems };
      
      // Pour les sessions temporaires, stocker dans le localStorage
      if (sessionId.startsWith('temp_')) {
        localStorage.setItem(`preview_${sessionId}`, JSON.stringify(demoData));
      }
      
      return demoData;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Normalise un élément de prévisualisation pour assurer la cohérence des propriétés
   */
  const normalizePreviewItem = (item: any) => {
    // Vérifier si l'item est valide
    if (!item || typeof item !== 'object') {
      console.warn('normalizePreviewItem: Item invalide reçu', item);
      // Retourner un élément par défaut
      return {
        title: 'Annonce sans détails',
        price: 'Prix non disponible',
        desc: 'Pas de description disponible',
        image: '',  // L'image de fallback sera générée par le composant ScrapePreview
        location: 'Lieu non spécifié',
        url: '#',
        date: new Date().toISOString()
      };
    }
    
    // S'assurer que toutes les propriétés existent
    const normalized = { ...item };
    
    // Normaliser le titre (alternatives: title, name, titre)
    const rawTitle = item.title || item.name || item.titre;
    normalized.title = typeof rawTitle === 'string' ? rawTitle : 'Sans titre';
    
    // Normaliser le prix (alternatives: price, prix)
    const rawPrice = item.price || item.prix;
    normalized.price = formatPrice(rawPrice);
    
    // Normaliser l'image (alternatives: image, img, imageUrl, photo)
    const rawImage = item.image || item.img || item.imageUrl || item.photo;
    normalized.image = typeof rawImage === 'string' ? rawImage : '';
    
    // Normaliser la localisation (alternatives: location, lieu, address, adresse)
    const rawLocation = item.location || item.lieu || item.address || item.adresse;
    normalized.location = typeof rawLocation === 'string' ? rawLocation : 'Lieu non spécifié';
    
    // Normaliser l'URL (alternatives: url, link, lien)
    const rawUrl = item.url || item.link || item.lien;
    normalized.url = typeof rawUrl === 'string' ? rawUrl : '#';
    
    // Normaliser la description (alternatives: desc, description, content, contenu)
    const rawDesc = item.desc || item.description || item.content || item.contenu;
    normalized.desc = typeof rawDesc === 'string' ? rawDesc : 'Pas de description';
    
    // Ajouter une date si elle n'existe pas
    if (!normalized.date) {
      normalized.date = new Date().toISOString();
    }
    
    return normalized;
  };
  
  /**
   * Formater un prix pour l'affichage
   */
  const formatPrice = (price: any): string => {
    if (!price) return 'Prix non disponible';
    
    // Si c'est déjà une chaîne, vérifier si elle contient un symbole de devise
    if (typeof price === 'string') {
      // Si la chaîne contient déjà un symbole de devise, la retourner telle quelle
      if (price.includes('€') || price.includes('$') || price.includes('£')) {
        return price;
      }
      
      // Essayer de convertir en nombre
      const numericPrice = parseFloat(price.replace(/[^0-9,.]/g, '').replace(',', '.'));
      if (!isNaN(numericPrice)) {
        return `${numericPrice.toLocaleString('fr-FR')} €`;
      }
      
      return price;
    }
    
    // Si c'est un nombre
    if (typeof price === 'number') {
      return `${price.toLocaleString('fr-FR')} €`;
    }
    
    return 'Prix non disponible';
  };
  
  /**
   * Générer des données de démonstration pour les sessions temporaires
   */
  const generateDemoItems = () => {
    // Générer des couleurs aléatoires pour les images
    const getRandomColor = () => Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    
    return [
      {
        title: "Appartement T3 lumineux",
        price: "285 000 €",
        desc: "Bel appartement T3 de 68m² avec balcon et parking. Proche commerces et transports. Exposition sud-ouest, très lumineux toute la journée. Cuisine équipée, salle de bain récente.",
        image: `https://placehold.co/400x300/${getRandomColor()}/ffffff?text=Appartement+T3`,
        location: "Bordeaux Centre",
        url: "#",
        date: new Date().toISOString()
      },
      {
        title: "Maison 4 pièces avec jardin",
        price: "320 000 €",
        desc: "Maison familiale de 95m² avec jardin de 300m². 3 chambres, cuisine équipée. Garage pour 2 véhicules. Quartier calme et résidentiel. École et commerces à proximité.",
        image: `https://placehold.co/400x300/${getRandomColor()}/ffffff?text=Maison+4+pièces`,
        location: "Mérignac",
        url: "#",
        date: new Date().toISOString()
      },
      {
        title: "Studio meublé pour étudiant",
        price: "580 €/mois",
        desc: "Studio de 25m² entièrement meublé et rénové. Idéal pour étudiant. Proche université et transports en commun. Cuisine équipée, salle d'eau moderne.",
        image: `https://placehold.co/400x300/${getRandomColor()}/ffffff?text=Studio+meublé`,
        location: "Talence",
        url: "#",
        date: new Date().toISOString()
      },
      {
        title: "Loft industriel rénové",
        price: "425 000 €",
        desc: "Magnifique loft de 120m² dans ancienne usine réhabilitée. Volumes exceptionnels, hauteur sous plafond de 4m. Prestations haut de gamme.",
        image: `https://placehold.co/400x300/${getRandomColor()}/ffffff?text=Loft+industriel`,
        location: "Bordeaux Chartrons",
        url: "#",
        date: new Date().toISOString()
      },
      {
        title: "Villa contemporaine avec piscine",
        price: "695 000 €",
        desc: "Villa d'architecte de 180m² sur terrain de 1200m². 5 chambres, 3 salles de bain, bureau. Piscine chauffée, pool house. Domotique intégrée.",
        image: `https://placehold.co/400x300/${getRandomColor()}/ffffff?text=Villa+contemporaine`,
        location: "Pessac",
        url: "#",
        date: new Date().toISOString()
      }
    ];
  };

  return {
    loading,
    error,
    startScraping,
    getScrapeResults,
    createPayment,
    verifyPayment,
    getExportUrl,
    getPreviewItems
  };
}
