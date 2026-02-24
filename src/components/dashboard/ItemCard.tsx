import React, { useState } from 'react';
import { ScrapedItem } from '@/types/scrapedItems';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MapPin,
  ExternalLink,
  Calendar,
  StickyNote,
  ImageOff,
} from 'lucide-react';
import ItemDetailModal from './ItemDetailModal';

interface ItemCardProps {
  item: ScrapedItem;
  onToggleFavorite: (itemId: number) => void;
  onUpdateNotes: (itemId: number, notes: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onToggleFavorite, onUpdateNotes }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'vehicle':
        return 'bg-navy-100 text-navy';
      case 'real_estate':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-cream-100 text-navy';
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle':
        return '🚗 Véhicule';
      case 'real_estate':
        return '🏠 Immobilier';
      default:
        return '🛍️ Marketplace';
    }
  };

  return (
    <>
      <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
        <div onClick={() => setShowDetail(true)}>
          {/* Image */}
          <div className="relative h-48 bg-cream-100 overflow-hidden">
            {!imageError && item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <ImageOff className="w-12 h-12 text-steel-200" />
              </div>
            )}
            
            {/* Badge type */}
            <Badge className={`absolute top-2 left-2 ${getItemTypeColor(item.item_type)}`}>
              {getItemTypeLabel(item.item_type)}
            </Badge>

            {/* Prix */}
            {item.price && (
              <div className="absolute top-2 right-2 bg-[#1a1d29]/95 backdrop-blur px-3 py-1 rounded-full shadow-lg border border-gray-700">
                <span className="font-bold text-navy">{item.price}</span>
              </div>
            )}

            {/* Bouton favori */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 bg-[#1a1d29]/90 hover:bg-[#1a1d29] shadow-md border border-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
            >
              <Heart
                className={`w-4 h-4 ${
                  item.is_favorite ? 'fill-red-500 text-red-500' : 'text-steel'
                }`}
              />
            </Button>
          </div>

          {/* Contenu */}
          <CardContent className="p-4 space-y-3">
            {/* Titre */}
            <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem] group-hover:text-navy transition-colors">
              {item.title}
            </h3>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-steel line-clamp-2 min-h-[2.5rem]">
                {item.description}
              </p>
            )}

            {/* Localisation */}
            {item.location && (
              <div className="flex items-center gap-2 text-sm text-steel">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {/* Date de publication */}
            {item.posted_at && (
              <div className="flex items-center gap-2 text-xs text-steel-200">
                <Calendar className="w-3 h-3" />
                <span>{item.posted_at}</span>
              </div>
            )}

            {/* Notes utilisateur */}
            {item.user_notes && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                <StickyNote className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 line-clamp-2">{item.user_notes}</p>
              </div>
            )}

            {/* Métadonnées spécifiques */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.item_type === 'vehicle' && (
                  <>
                    {item.metadata.make && (
                      <Badge variant="outline" className="text-xs">
                        {item.metadata.make}
                      </Badge>
                    )}
                    {item.metadata.year && (
                      <Badge variant="outline" className="text-xs">
                        {item.metadata.year}
                      </Badge>
                    )}
                  </>
                )}
                {item.item_type === 'real_estate' && (
                  <>
                    {item.metadata.bedrooms && (
                      <Badge variant="outline" className="text-xs">
                        🛏️ {item.metadata.bedrooms}
                      </Badge>
                    )}
                    {item.metadata.surface_area && (
                      <Badge variant="outline" className="text-xs">
                        📐 {item.metadata.surface_area}m²
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </div>

        {/* Footer avec lien */}
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              if (item.url) window.open(item.url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Voir l'annonce
          </Button>
        </div>
      </Card>

      {/* Modal de détail */}
      <ItemDetailModal
        item={item}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onToggleFavorite={onToggleFavorite}
        onUpdateNotes={onUpdateNotes}
      />
    </>
  );
};

export default ItemCard;
