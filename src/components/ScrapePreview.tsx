
type Item = {
  // Propriétés standard
  title?: string;
  name?: string; // Alternative à title
  price?: string | number;
  prix?: string | number; // Alternative à price
  desc?: string;
  description?: string; // Alternative à desc
  image?: string;
  imageUrl?: string; // Alternative à image
  img?: string; // Alternative à image
  thumbnail?: string; // Alternative à image
  location?: string;
  lieu?: string; // Alternative à location
  url?: string; // Lien de l'annonce
  link?: string; // Alternative à url
  href?: string; // Alternative à url
  postedAt?: string; // Date de publication
  date?: string; // Alternative à postedAt
  [key: string]: any; // Pour accepter d'autres propriétés
};

// Type pour les items normalisés
type NormalizedItem = {
  title: string;
  price: string;
  desc: string;
  image: string;
  location: string;
  url: string;
  date?: string;
};

import { MapPin, Calendar, ExternalLink, ImageOff, X } from 'lucide-react';
import { useState } from 'react';

export default function ScrapePreview({ items }: { items: Item[] }) {
  // État pour le modal de détails
  const [selectedItem, setSelectedItem] = useState<NormalizedItem | null>(null);
  
  // Log pour déboguer
  console.log('ScrapePreview: Rendu avec', items?.length || 0, 'items');
  if (items && items.length > 0) {
    console.log('Premier item:', JSON.stringify(items[0], null, 2));
  }
  
  // Fonction pour extraire et formater le prix à partir de structures complexes
  const extractAndFormatPrice = (item: any): string => {
    // Cas spécifique pour Facebook Marketplace
    if (item.listing_price) {
      // Cas 1: listing_price.formatted_amount (déjà formaté avec devise)
      if (item.listing_price.formatted_amount && typeof item.listing_price.formatted_amount === 'string') {
        console.log('Prix formaté Facebook trouvé dans listing_price.formatted_amount:', item.listing_price.formatted_amount);
        return item.listing_price.formatted_amount;
      }
      
      // Cas 2: listing_price.amount + currency
      if (item.listing_price.amount) {
        const amount = item.listing_price.amount;
        const currency = item.listing_price.currency || 'EUR';
        
        // Convertir en nombre si c'est une chaîne
        const numAmount = typeof amount === 'string' ? 
          parseFloat(amount.replace(/[^0-9.,]/g, '').replace(',', '.')) : 
          amount;
        
        if (!isNaN(numAmount)) {
          const formattedPrice = new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: currency 
          }).format(numAmount);
          console.log('Prix Facebook formaté depuis listing_price.amount:', formattedPrice);
          return formattedPrice;
        }
      }
    }
    
    // Cas spécifique pour Facebook Marketplace - marketplace_listing_price
    if (item.marketplace_listing_price) {
      if (typeof item.marketplace_listing_price === 'string') {
        console.log('Prix Facebook trouvé dans marketplace_listing_price (string):', item.marketplace_listing_price);
        return item.marketplace_listing_price;
      } else if (typeof item.marketplace_listing_price === 'number') {
        const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.marketplace_listing_price);
        console.log('Prix Facebook formaté depuis marketplace_listing_price (number):', formattedPrice);
        return formattedPrice;
      }
    }
    
    // Cas spécifique pour Facebook Marketplace - price_amount
    if (item.price_amount) {
      const currency = item.price_currency || 'EUR';
      if (typeof item.price_amount === 'number') {
        const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(item.price_amount);
        console.log('Prix Facebook formaté depuis price_amount:', formattedPrice);
        return formattedPrice;
      } else if (typeof item.price_amount === 'string') {
        const numAmount = parseFloat(item.price_amount.replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!isNaN(numAmount)) {
          const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(numAmount);
          console.log('Prix Facebook formaté depuis price_amount (string):', formattedPrice);
          return formattedPrice;
        }
      }
    }
    
    // Recherche standard dans les propriétés de premier niveau
    const possiblePriceKeys = ['price', 'prix', 'amount', 'cost', 'value', 'price_value', 'formatted_price'];
    for (const key of possiblePriceKeys) {
      if (item[key] !== undefined && item[key] !== null) {
        let rawPrice = item[key];
        
        // Si c'est un nombre, le formater avec le symbole €
        if (typeof rawPrice === 'number') {
          const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(rawPrice);
          console.log(`Prix trouvé dans la propriété ${key} (number):`, formattedPrice);
          return formattedPrice;
        }
        
        // Si c'est une chaîne qui contient déjà un symbole de devise, la retourner telle quelle
        if (typeof rawPrice === 'string') {
          if (rawPrice.includes('€') || rawPrice.includes('$') || rawPrice.includes('£') || /\d+\s*(\u20ac|\$|\u00a3|EUR|USD|GBP)/i.test(rawPrice)) {
            console.log(`Prix formaté trouvé dans la propriété ${key} (string avec devise):`, rawPrice);
            return rawPrice;
          }
          
          // Sinon, essayer de convertir en nombre et formater
          const numPrice = parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
          if (!isNaN(numPrice)) {
            const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numPrice);
            console.log(`Prix formaté depuis la propriété ${key} (string convert en number):`, formattedPrice);
            return formattedPrice;
          }
        }
      }
    }
    
    // Recherche dans les sous-objets
    for (const key in item) {
      if (item[key] && typeof item[key] === 'object' && item[key] !== null) {
        for (const priceKey of possiblePriceKeys) {
          if (item[key][priceKey] !== undefined && item[key][priceKey] !== null) {
            let rawPrice = item[key][priceKey];
            
            // Si c'est un nombre, le formater avec le symbole €
            if (typeof rawPrice === 'number') {
              const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(rawPrice);
              console.log(`Prix trouvé dans la sous-propriété ${key}.${priceKey} (number):`, formattedPrice);
              return formattedPrice;
            }
            
            // Si c'est une chaîne qui contient déjà un symbole de devise, la retourner telle quelle
            if (typeof rawPrice === 'string') {
              if (rawPrice.includes('€') || rawPrice.includes('$') || rawPrice.includes('£') || /\d+\s*(\u20ac|\$|\u00a3|EUR|USD|GBP)/i.test(rawPrice)) {
                console.log(`Prix formaté trouvé dans la sous-propriété ${key}.${priceKey} (string avec devise):`, rawPrice);
                return rawPrice;
              }
              
              // Sinon, essayer de convertir en nombre et formater
              const numPrice = parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
              if (!isNaN(numPrice)) {
                const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numPrice);
                console.log(`Prix formaté depuis la sous-propriété ${key}.${priceKey} (string convert en number):`, formattedPrice);
                return formattedPrice;
              }
            }
          }
        }
      }
    }
    
    // Si tout échoue, retourner un message par défaut
    console.log('Aucun prix trouvé pour cet item');
    return 'Prix non disponible';
  };
  
  // Fonction pour extraire la description à partir de structures complexes
  const extractDescription = (item: any): string => {
    // Cas spécifiques pour Facebook Marketplace
    if (item.redacted_description) {
      if (typeof item.redacted_description === 'string') {
        console.log('Description Facebook trouvée dans redacted_description (string):', item.redacted_description.substring(0, 50) + '...');
        return item.redacted_description;
      } else if (typeof item.redacted_description === 'object' && item.redacted_description !== null) {
        if (item.redacted_description.text) {
          console.log('Description Facebook trouvée dans redacted_description.text:', item.redacted_description.text.substring(0, 50) + '...');
          return item.redacted_description.text;
        }
      }
    }
    
    // Cas spécifique pour Facebook Marketplace - marketplace_listing_description
    if (item.marketplace_listing_description && typeof item.marketplace_listing_description === 'string') {
      console.log('Description Facebook trouvée dans marketplace_listing_description:', item.marketplace_listing_description.substring(0, 50) + '...');
      return item.marketplace_listing_description;
    }
    
    // Cas spécifique pour Facebook Marketplace - story
    if (item.story && typeof item.story === 'object' && item.story.message) {
      console.log('Description Facebook trouvée dans story.message:', item.story.message.substring(0, 50) + '...');
      return item.story.message;
    }
    
    // Recherche standard dans les propriétés de premier niveau
    const possibleDescKeys = ['desc', 'description', 'content', 'text', 'body', 'message', 'details', 'info'];
    for (const key of possibleDescKeys) {
      if (item[key] && typeof item[key] === 'string' && item[key].length > 0) {
        console.log(`Description trouvée dans la propriété ${key}:`, item[key].substring(0, 50) + '...');
        return item[key];
      }
    }
    
    // Recherche dans les sous-objets
    for (const key in item) {
      if (item[key] && typeof item[key] === 'object' && item[key] !== null) {
        for (const descKey of possibleDescKeys) {
          if (item[key][descKey] && typeof item[key][descKey] === 'string' && item[key][descKey].length > 0) {
            console.log(`Description trouvée dans la sous-propriété ${key}.${descKey}:`, item[key][descKey].substring(0, 50) + '...');
            return item[key][descKey];
          }
        }
      }
    }
    
    // Recherche spécifique dans les structures imbriquées de Facebook
    if (item.listing_objects && Array.isArray(item.listing_objects) && item.listing_objects.length > 0) {
      const listing = item.listing_objects[0];
      if (listing && listing.description) {
        console.log('Description trouvée dans listing_objects[0].description:', listing.description.substring(0, 50) + '...');
        return listing.description;
      }
    }
    
    // Fallback sur les titres Facebook
    if (item.marketplace_listing_title) {
      console.log('Utilisation du titre marketplace comme description:', item.marketplace_listing_title);
      return item.marketplace_listing_title;
    }
    
    if (item.custom_title) {
      console.log('Utilisation du titre personnalisé comme description:', item.custom_title);
      return item.custom_title;
    }
    
    // Si aucune description n'est trouvée, utiliser le titre
    if (item.title || item.name) {
      console.log('Utilisation du titre comme description:', item.title || item.name);
      return item.title || item.name;
    }
    
    return 'Pas de description';
  };
  
  // Fonction pour valider une URL d'image
  const isValidImageUrl = (url: string): boolean => {
    if (!url || url === '') return false;
    
    // Vérifier si l'URL est absolue
    try {
      new URL(url);
      // Accepter toutes les URLs de Facebook qui contiennent fbcdn.net ou scontent car ce sont des images valides
      if (url.includes('fbcdn.net') || url.includes('scontent')) {
        console.log('Image Facebook détectée et validée:', url);
        return true;
      }
      
      // Vérifier que l'URL se termine par une extension d'image commune
      // ou contient des mots-clés d'image dans le chemin
      const urlLower = url.toLowerCase();
      const isImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)($|\?)/i.test(urlLower);
      const isImagePath = /(image|img|photo|picture|thumbnail)/i.test(urlLower);
      return isImageExtension || isImagePath;
    } catch (e) {
      // Si ce n'est pas une URL valide, vérifier si c'est un chemin relatif
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  };
  
  // Fonction pour extraire une URL d'image valide de structures complexes
  const extractImageUrl = (item: any): string => {
    // Cas spécifiques pour Facebook Marketplace
    if (item.primary_listing_photo) {
      // Cas 1: primary_listing_photo.image.uri
      if (item.primary_listing_photo.image && item.primary_listing_photo.image.uri) {
        console.log('Image Facebook trouvée dans primary_listing_photo.image.uri:', item.primary_listing_photo.image.uri);
        return item.primary_listing_photo.image.uri;
      }
      // Cas 2: primary_listing_photo.listing_image.uri
      if (item.primary_listing_photo.listing_image && item.primary_listing_photo.listing_image.uri) {
        console.log('Image Facebook trouvée dans primary_listing_photo.listing_image.uri:', item.primary_listing_photo.listing_image.uri);
        return item.primary_listing_photo.listing_image.uri;
      }
    }
    
    // Cas 3: listing_photos[0].image.uri
    if (item.listing_photos && Array.isArray(item.listing_photos) && item.listing_photos.length > 0) {
      if (item.listing_photos[0].image && item.listing_photos[0].image.uri) {
        console.log('Image Facebook trouvée dans listing_photos[0].image.uri:', item.listing_photos[0].image.uri);
        return item.listing_photos[0].image.uri;
      }
    }
    
    // Cas 4: profile_picture pour les annonces de profil Facebook
    if (item.profile_picture && typeof item.profile_picture === 'object') {
      if (item.profile_picture.uri) {
        console.log('Image Facebook trouvée dans profile_picture.uri:', item.profile_picture.uri);
        return item.profile_picture.uri;
      }
      if (item.profile_picture.url) {
        console.log('Image Facebook trouvée dans profile_picture.url:', item.profile_picture.url);
        return item.profile_picture.url;
      }
    }
    
    // Cas 5: image_url pour les annonces Facebook
    if (item.image_url && typeof item.image_url === 'string') {
      console.log('Image Facebook trouvée dans image_url:', item.image_url);
      return item.image_url;
    }
    
    // Cas 6: media_with_integrity pour les annonces Facebook
    if (item.media_with_integrity && Array.isArray(item.media_with_integrity) && item.media_with_integrity.length > 0) {
      const media = item.media_with_integrity[0];
      if (media && media.image && media.image.uri) {
        console.log('Image Facebook trouvée dans media_with_integrity[0].image.uri:', media.image.uri);
        return media.image.uri;
      }
    }
    
    // Recherche standard dans les propriétés de premier niveau
    const possibleImageKeys = ['image', 'imageUrl', 'img', 'thumbnail', 'photo', 'picture', 'src', 'uri', 'url', 'cover_photo'];
    for (const key of possibleImageKeys) {
      if (item[key] && typeof item[key] === 'string' && item[key].length > 0) {
        console.log(`Image trouvée dans la propriété ${key}:`, item[key]);
        return item[key];
      }
    }
    
    // Recherche dans les sous-objets
    for (const key in item) {
      if (item[key] && typeof item[key] === 'object' && item[key] !== null) {
        for (const imgKey of possibleImageKeys) {
          if (item[key][imgKey] && typeof item[key][imgKey] === 'string' && item[key][imgKey].length > 0) {
            console.log(`Image trouvée dans la sous-propriété ${key}.${imgKey}:`, item[key][imgKey]);
            return item[key][imgKey];
          }
        }
      }
    }
    
    // Recherche dans les tableaux d'images
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      if (typeof item.images[0] === 'string') {
        console.log('Image trouvée dans le tableau images[0]:', item.images[0]);
        return item.images[0];
      } else if (typeof item.images[0] === 'object' && item.images[0] !== null) {
        for (const imgKey of possibleImageKeys) {
          if (item.images[0][imgKey] && typeof item.images[0][imgKey] === 'string') {
            console.log(`Image trouvée dans images[0].${imgKey}:`, item.images[0][imgKey]);
            return item.images[0][imgKey];
          }
        }
      }
    }
    
    // Si aucune image n'est trouvée
    console.log('Aucune image trouvée pour cet item');
    return '';
  };
  
  // Fonction pour obtenir une URL d'image de remplacement basée sur le titre et l'URL
  const getFallbackImageUrl = (item: any): string => {
    // Extraire le titre et l'URL pour générer une image plus pertinente
    const title = item.title || item.name || 'Annonce';
    const url = item.url || item.link || item.href || '';
    
    // Extraire le domaine de l'URL si disponible
    let domain = '';
    try {
      if (url && url.includes('://')) {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace('www.', '');
      }
    } catch (e) {
      console.warn('Erreur lors de l\'extraction du domaine:', e);
    }
    
    // Nettoyer et encoder le titre pour l'utiliser dans l'URL
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const shortTitle = cleanTitle.length > 0 ? cleanTitle.substring(0, 20) : 'Annonce';
    
    // Générer une couleur basée sur le titre pour avoir une cohérence visuelle
    // Utiliser une fonction de hachage simple pour générer une couleur stable pour le même titre
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convertir en entier 32 bits
      }
      return Math.abs(hash);
    };
    
    const colorSeed = hashCode(title + domain);
    const bgColor = ((colorSeed % 0xffffff) | 0).toString(16).padStart(6, '0');
    const textColor = 'ffffff';
    
    // Ajouter le domaine au texte de l'image si disponible
    const displayText = domain 
      ? `${shortTitle} (${domain})` 
      : shortTitle;
    
    const encodedText = encodeURIComponent(displayText);
    return `https://placehold.co/400x300/${bgColor}/${textColor}?text=${encodedText}`;
  };
  
  // Normaliser les items pour gérer différentes structures de données
  const normalizedItems: NormalizedItem[] = items?.map(item => {
    if (!item || typeof item !== 'object') {
      console.warn('ScrapePreview: Item invalide détecté', item);
      // Créer un élément par défaut pour éviter les erreurs
      const defaultItem = {
        title: 'Annonce sans détails',
        price: 'Prix non disponible',
        desc: 'Pas de description disponible',
        image: '',
        location: 'Lieu non spécifié',
        url: '',
        date: undefined
      };
      return {
        ...defaultItem,
        image: getFallbackImageUrl(defaultItem)
      };
    }
    
    // Conserver l'objet original pour la génération d'image de fallback
    const originalItem = { ...item };
    
    // Extraire et formater le titre
    let rawTitle = item.title || item.name;
    if (!rawTitle && item.marketplace_listing_title) {
      rawTitle = item.marketplace_listing_title;
      console.log('Titre Facebook trouvé:', rawTitle);
    } else if (!rawTitle && item.custom_title) {
      rawTitle = item.custom_title;
      console.log('Titre personnalisé trouvé:', rawTitle);
    }
    
    const title = rawTitle || 'Sans titre';
    
    // Extraire et formater le prix avec la fonction améliorée
    const price = extractAndFormatPrice(item);
    console.log('Prix formaté:', price);
    
    // Extraire la description avec la fonction améliorée
    const desc = extractDescription(item);
    console.log('Description extraite:', desc.substring(0, 50) + (desc.length > 50 ? '...' : ''));
    
    // Extraire et valider l'URL de l'image
    // Recherche plus approfondie de l'image dans l'objet
    let rawImageUrl = '';
    const possibleImageKeys = ['image', 'imageUrl', 'img', 'thumbnail', 'photo', 'picture', 'src', 'uri'];
    
    // Rechercher d'abord dans les propriétés de premier niveau
    for (const key of possibleImageKeys) {
      if (item[key] && typeof item[key] === 'string' && item[key].length > 0) {
        rawImageUrl = item[key];
        console.log(`Image trouvée dans la propriété ${key}:`, rawImageUrl);
        break;
      }
    }
    
    // Si aucune image n'est trouvée, chercher dans les sous-objets
    if (!rawImageUrl) {
      for (const key in item) {
        if (item[key] && typeof item[key] === 'object' && item[key] !== null) {
          for (const imgKey of possibleImageKeys) {
            if (item[key][imgKey] && typeof item[key][imgKey] === 'string' && item[key][imgKey].length > 0) {
              rawImageUrl = item[key][imgKey];
              console.log(`Image trouvée dans la sous-propriété ${key}.${imgKey}:`, rawImageUrl);
              break;
            }
          }
          if (rawImageUrl) break;
        }
      }
    }
    
    // Utiliser la fonction d'extraction d'image améliorée
    if (!rawImageUrl) {
      rawImageUrl = extractImageUrl(item);
      if (rawImageUrl) {
        console.log('Image extraite avec la fonction améliorée:', rawImageUrl);
      }
    }
    
    // Extraire la localisation avec validation
    let rawLocation = item.location || item.lieu || item.address || item.adresse;
    
    // Recherche spécifique pour la structure Facebook Marketplace
    if ((!rawLocation || typeof rawLocation !== 'string') && item.location) {
      // Vérifier que location est un objet et contient reverse_geocode
      const locationObj = item.location as any;
      if (typeof locationObj === 'object' && locationObj !== null && 
          'reverse_geocode' in locationObj && 
          locationObj.reverse_geocode && 
          typeof locationObj.reverse_geocode === 'object' && 
          locationObj.reverse_geocode.city) {
        const city = locationObj.reverse_geocode.city;
        const state = locationObj.reverse_geocode.state || '';
        rawLocation = state ? `${city}, ${state}` : city;
        console.log('Localisation Facebook trouvée:', rawLocation);
      }
    }
    
    const location = rawLocation && typeof rawLocation === 'string' ? rawLocation : 'Lieu non spécifié';
    
    // Extraire l'URL de l'annonce avec validation
    const rawUrl = item.url || item.link || item.href;
    const url = rawUrl && typeof rawUrl === 'string' ? rawUrl : '';
    
    // Extraire la date avec validation
    const rawDate = item.postedAt || item.date;
    const date = rawDate && typeof rawDate === 'string' ? rawDate : undefined;
    
    // Créer l'objet normalisé avec les données extraites
    const normalized = {
      title,
      price,
      desc,
      image: '',  // Sera rempli ci-dessous
      location,
      url,
      date
    };
    
    // Générer l'image de fallback basée sur l'item complet pour plus de contexte
    normalized.image = isValidImageUrl(rawImageUrl) ? rawImageUrl : getFallbackImageUrl(originalItem);
    
    // Log de débogage pour l'image
    console.log(`ScrapePreview: Item "${title}" - Image source: ${rawImageUrl || 'non disponible'}, Image utilisée: ${normalized.image}`);
    
    return normalized;
  }) || [];
  
  console.log('Items normalisés:', normalizedItems);
  
  // Vérifier si nous avons des items valides
  if (!normalizedItems || normalizedItems.length === 0) {
    return (
      <div className="w-full mt-4 bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <ImageOff className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2 tracking-tight">Aucun aperçu disponible</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Aucune annonce n'a été trouvée pour cette session. Cela peut être dû à une erreur lors du scraping ou à l'absence de résultats correspondant à vos critères.
          </p>
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-accent-foreground">
              Essayez de relancer le scraping avec des critères différents ou contactez le support si le problème persiste.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full mt-4 bg-card rounded-xl p-6 border border-border shadow-sm">
      <h3 className="text-xl font-bold mb-2 tracking-tight">Aperçu gratuit ({normalizedItems.length} annonces)</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {normalizedItems.map((itm, i) => (
          <div
            key={i}
            className="bg-muted rounded-lg border border-muted p-3 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => setSelectedItem(itm)}
          >
            <div className="w-full h-36 bg-gray-100 flex items-center justify-center mb-2 rounded overflow-hidden relative">
              {itm.image ? (
                <img 
                  src={itm.image} 
                  alt={itm.title} 
                  className="object-cover w-full h-full" 
                  onError={(e) => {
                    console.warn(`Erreur de chargement d'image pour: ${itm.title}`, e);
                    // Utiliser la même fonction de génération d'image de remplacement que pour la normalisation
                    // pour garantir la cohérence visuelle
                    if (!e.currentTarget.hasAttribute('data-fallback-loaded')) {
                      e.currentTarget.src = getFallbackImageUrl({
                        title: itm.title,
                        url: itm.url,
                        // Ajouter d'autres propriétés disponibles pour améliorer la génération d'image
                        location: itm.location,
                        price: itm.price
                      });
                      // Ajouter une classe pour indiquer l'erreur
                      e.currentTarget.classList.add('image-error');
                      // Ajouter un attribut pour éviter les tentatives de rechargement infinies
                      e.currentTarget.setAttribute('data-fallback-loaded', 'true');
                    }
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center justify-center">
                  <ImageOff className="h-10 w-10 mb-1 opacity-50" />
                  <span>Pas d'image</span>
                </div>
              )}
              {/* Badge de prix */}
              <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                {itm.price}
              </div>
            </div>
            <div className="font-semibold truncate" title={itm.title}>{itm.title}</div>
            <div className="text-xs text-gray-500 line-clamp-3 min-h-[3rem] whitespace-pre-wrap">{itm.desc}</div>
            <div className="text-xs text-accent mt-1 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {itm.location}
            </div>
            {itm.date && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {itm.date}
              </div>
            )}
            {itm.url && (
              <a 
                href={itm.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Voir l'annonce
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col items-center">
        <div className="bg-muted/50 p-3 rounded-lg border border-border">
          <span className="text-sm text-destructive font-medium">
            Pour voir toutes les annonces & exporter<br />passez sur l'offre complète !
          </span>
        </div>
      </div>

      {/* Modal de détails */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Entête du modal */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-xl font-bold truncate">{selectedItem.title}</h3>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Contenu du modal */}
            <div className="flex flex-col md:flex-row overflow-hidden flex-1">
              {/* Image */}
              <div className="w-full md:w-1/2 h-64 md:h-auto bg-muted flex items-center justify-center p-2">
                {selectedItem.image ? (
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.title} 
                    className="object-contain max-h-full max-w-full rounded" 
                    onError={(e) => {
                      e.currentTarget.src = getFallbackImageUrl({
                        title: selectedItem.title,
                        url: selectedItem.url,
                        location: selectedItem.location,
                        price: selectedItem.price
                      });
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <ImageOff className="h-16 w-16 text-muted-foreground mb-2 opacity-50" />
                    <span className="text-muted-foreground">Pas d'image disponible</span>
                  </div>
                )}
              </div>
              
              {/* Détails */}
              <div className="flex-1 p-4 overflow-auto">
                {/* Prix */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary">{selectedItem.price}</span>
                </div>
                
                {/* Localisation */}
                <div className="flex items-center mb-4 text-sm">
                  <MapPin className="h-4 w-4 mr-1 text-accent" />
                  <span>{selectedItem.location}</span>
                </div>
                
                {/* Date */}
                {selectedItem.date && (
                  <div className="flex items-center mb-4 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{selectedItem.date}</span>
                  </div>
                )}
                
                {/* Description */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm">
                    {selectedItem.desc || 'Pas de description disponible'}
                  </div>
                </div>
                
                {/* Lien */}
                {selectedItem.url && (
                  <div className="mt-6">
                    <a 
                      href={selectedItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors w-full md:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Voir l'annonce originale
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
