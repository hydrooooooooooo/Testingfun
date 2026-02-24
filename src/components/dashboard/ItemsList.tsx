import React from 'react';
import { ScrapedItem } from '@/types/scrapedItems';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, ExternalLink, Calendar, ImageOff } from 'lucide-react';

interface ItemsListProps {
  items: ScrapedItem[];
  onToggleFavorite: (itemId: number) => void;
  onUpdateNotes: (itemId: number, notes: string) => void;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, onToggleFavorite }) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Image miniature */}
              <div className="w-32 h-32 flex-shrink-0 bg-cream-100 rounded-lg overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-steel-200" />
                  </div>
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-steel line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Prix */}
                  {item.price && (
                    <div className="flex-shrink-0">
                      <Badge className="bg-navy-100 text-navy text-base px-3 py-1">
                        {item.price}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Métadonnées */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-steel">
                  {item.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  {item.posted_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{item.posted_at}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleFavorite(item.id)}
                  >
                    <Heart
                      className={`w-4 h-4 mr-2 ${
                        item.is_favorite ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                    {item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  </Button>
                  
                  {item.url && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => window.open(item.url!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Voir l'annonce
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ItemsList;
