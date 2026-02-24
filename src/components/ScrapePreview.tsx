
import { MapPin, Calendar, ExternalLink, ImageOff, X } from 'lucide-react';
import { useState, useMemo } from 'react';

type Item = {
  // Propriétés standard et alternatives pour une robustesse maximale
  title?: string;
  name?: string;
  price?: string | number;
  prix?: string | number;
  desc?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  img?: string;
  thumbnail?: string;
  location?: string;
  lieu?: string;
  url?: string;
  link?: string;
  href?: string;
  postedAt?: string;
  date?: string;
  [key: string]: any; // Pour accepter toutes les autres propriétés
};

// Type pour les items après normalisation, garantissant une structure de données fiable
type NormalizedItem = {
  title: string;
  price: string;
  desc: string;
  image: string;
  location: string;
  url: string;
  date?: string;
};

export default function ScrapePreview({ items }: { items: Item[] }) {
  const [selectedItem, setSelectedItem] = useState<NormalizedItem | null>(null);

  // --- FONCTIONS D'AIDE À L'EXTRACTION ET À LA NORMALISATION ---

  const extractAndFormatPrice = (item: any): string => {
    if (item.listing_price) {
      if (item.listing_price.formatted_amount) return item.listing_price.formatted_amount;
      if (item.listing_price.amount) {
        const amount = parseFloat(String(item.listing_price.amount).replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!isNaN(amount)) return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: item.listing_price.currency || 'EUR' }).format(amount);
      }
    }
    const priceValue = item.price || item.prix;
    if (typeof priceValue === 'number') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(priceValue);
    if (typeof priceValue === 'string') {
        if (/[€$£]/.test(priceValue)) return priceValue;
        const amount = parseFloat(priceValue.replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!isNaN(amount)) return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
        return priceValue; // Retourne la chaîne si elle ne peut être formatée
    }
    return 'Prix non disponible';
  };

  const extractDescription = (item: any): string => {
    return item.desc || item.description || item.redacted_description?.text || 'Pas de description disponible';
  };

  const extractImageUrl = (item: any): string => {
    const imageUrl = item.image || item.imageUrl || item.img || item.thumbnail || item.primary_listing_photo?.image?.uri;
    if (imageUrl && typeof imageUrl === 'string') {
        try {
            new URL(imageUrl);
            return imageUrl;
        } catch (e) {
            // Gérer les URL relatives ou invalides si nécessaire
        }
    }
    return '';
  };
  
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const getFallbackImageUrl = (item: any): string => {
    const title = item.title || 'Annonce';
    const colorSeed = hashCode(title);
    const bgColor = (colorSeed & 0xFFFFFF).toString(16).padStart(6, '0');
    const encodedText = encodeURIComponent(title.substring(0, 20));
    return `https://placehold.co/400x300/${bgColor}/FFFFFF?text=${encodedText}`;
  };

  const normalizeItem = (item: Item): NormalizedItem => {
    const title = item.title || item.name || 'Sans titre';
    const desc = extractDescription(item);
    let image = extractImageUrl(item);
    if (!image) {
        image = getFallbackImageUrl({ title });
    }

    return {
      title,
      price: extractAndFormatPrice(item),
      desc,
      image,
      location: item.location || item.lieu || 'Lieu non spécifié',
      url: item.url || item.link || '#',
      date: item.postedAt || item.date,
    };
  };

  // --- FIN DES FONCTIONS D'AIDE ---

  // Utilisation de useMemo pour ne recalculer les items normalisés que si la prop `items` change
  const normalizedItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    console.log('ScrapePreview: Normalisation de', items.length, 'items');
    return items.map(normalizeItem).slice(0, 3);
  }, [items]);

  if (normalizedItems.length === 0) {
    return (
      <div className="w-full mt-4 bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <ImageOff className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2 tracking-tight">Aucun aperçu disponible</h3>
          <p className="text-muted-foreground text-center max-w-md">
            La collecte n'a retourné aucune annonce. Veuillez vérifier l'URL ou réessayer.
          </p>
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
            <div className="w-full h-36 bg-cream-100 flex items-center justify-center mb-2 rounded overflow-hidden relative">
              <img 
                src={itm.image} 
                alt={itm.title} 
                className="object-cover w-full h-full" 
                onError={(e) => { e.currentTarget.src = getFallbackImageUrl(itm); }}
                loading="lazy"
              />
              <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                {itm.price}
              </div>
            </div>
            <div className="font-semibold truncate" title={itm.title}>{itm.title}</div>
            <div className="text-xs text-steel line-clamp-3 min-h-[3rem]">{itm.desc}</div>
            <div className="text-xs text-accent mt-1 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {itm.location}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-xl font-bold truncate">{selectedItem.title}</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-64 object-cover rounded-md mb-4" onError={(e) => { e.currentTarget.src = getFallbackImageUrl(selectedItem); }} />
                <span className="text-2xl font-bold text-primary">{selectedItem.price}</span>
                <div className="flex items-center my-2 text-sm">
                  <MapPin className="h-4 w-4 mr-1 text-accent" />
                  <span>{selectedItem.location}</span>
                </div>
                {selectedItem.date && (
                    <div className="flex items-center mb-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{selectedItem.date}</span>
                    </div>
                )}
                <h4 className="font-semibold mt-4 mb-2">Description</h4>
                <p className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">{selectedItem.desc}</p>
                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir l'annonce originale
                </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
