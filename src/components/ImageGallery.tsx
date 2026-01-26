import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from './ImageUpload';

interface ImageGalleryProps {
  images: string[];
  onImagesChange?: (images: string[]) => void;
  editable?: boolean;
  className?: string;
}

export function ImageGallery({ 
  images, 
  onImagesChange, 
  editable = false,
  className = '' 
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  const hasImages = images.length > 0;
  const hasMultiple = images.length > 1;

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleRemoveImage = (index: number) => {
    if (!onImagesChange) return;
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    if (currentIndex >= newImages.length && newImages.length > 0) {
      setCurrentIndex(newImages.length - 1);
    }
  };

  const handleAddImages = (newImages: string[]) => {
    if (!onImagesChange) return;
    onImagesChange(newImages);
    setShowUpload(false);
  };

  // Show upload modal
  if (showUpload && editable) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-background/95 z-10 flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Gestionar Imágenes</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
              Cerrar
            </Button>
          </div>
          <ImageUpload 
            images={images} 
            onImagesChange={handleAddImages}
            maxImages={10}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasImages) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Sin imágenes</p>
          {editable && onImagesChange && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 gap-2"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="w-4 h-4" />
              Añadir Imágenes
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Current Image */}
      <img 
        src={images[currentIndex]} 
        alt={`Imagen ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Navigation Arrows */}
      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goPrev}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goNext}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Image Counter */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Dots Navigation */}
      {hasMultiple && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Edit Controls */}
      {editable && onImagesChange && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowUpload(true)}
            className="bg-background/80 hover:bg-background"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => handleRemoveImage(currentIndex)}
            className="bg-destructive/80 hover:bg-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
