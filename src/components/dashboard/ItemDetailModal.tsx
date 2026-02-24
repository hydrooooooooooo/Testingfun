import React, { useState } from 'react';
import { ScrapedItem } from '@/types/scrapedItems';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MapPin,
  ExternalLink,
  Calendar,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from 'lucide-react';

interface ItemDetailModalProps {
  item: ScrapedItem;
  open: boolean;
  onClose: () => void;
  onToggleFavorite: (itemId: number) => void;
  onUpdateNotes: (itemId: number, notes: string) => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  open,
  onClose,
  onToggleFavorite,
  onUpdateNotes,
}) => {
  const [notes, setNotes] = useState(item.user_notes || '');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = item.images && item.images.length > 0 ? item.images : [item.image_url].filter(Boolean);

  const handleSaveNotes = () => {
    onUpdateNotes(item.id, notes);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    setImageError(false);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setImageError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl pr-8">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Galerie d'images */}
          {images.length > 0 && (
            <div className="relative">
              <div className="relative h-96 bg-cream-100 rounded-lg overflow-hidden">
                {!imageError && images[currentImageIndex] ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={`${item.title} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-16 h-16 text-steel-200" />
                  </div>
                )}

                {/* Navigation images */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border border-cream-300 text-navy"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border border-cream-300 text-navy"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Miniatures */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentImageIndex(idx);
                        setImageError(false);
                      }}
                      className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                        idx === currentImageIndex ? 'border-navy' : 'border-cream-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Miniature ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prix et actions */}
          <div className="flex items-center justify-between">
            {item.price && (
              <div className="text-3xl font-bold text-navy">{item.price}</div>
            )}
            <div className="flex gap-2">
              <Button
                variant={item.is_favorite ? 'default' : 'outline'}
                onClick={() => onToggleFavorite(item.id)}
              >
                <Heart
                  className={`w-4 h-4 mr-2 ${item.is_favorite ? 'fill-current' : ''}`}
                />
                {item.is_favorite ? 'Favori' : 'Ajouter aux favoris'}
              </Button>
              {item.url && (
                <Button onClick={() => window.open(item.url!, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir l'annonce
                </Button>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="grid grid-cols-2 gap-4">
            {item.location && (
              <div className="flex items-center gap-2 text-steel">
                <MapPin className="w-5 h-5" />
                <span>{item.location}</span>
              </div>
            )}
            {item.posted_at && (
              <div className="flex items-center gap-2 text-steel">
                <Calendar className="w-5 h-5" />
                <span>{item.posted_at}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-navy-700 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* Métadonnées spécifiques */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Détails</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(item.metadata).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="flex justify-between p-2 bg-cream-50 rounded">
                      <span className="text-steel capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes personnelles */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Notes personnelles</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez vos notes ici..."
              rows={4}
              className="w-full"
            />
            <Button onClick={handleSaveNotes} className="mt-2" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder les notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;
