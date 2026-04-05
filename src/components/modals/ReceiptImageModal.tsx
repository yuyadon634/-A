'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ReceiptImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ReceiptImageModal({ imageUrl, onClose }: ReceiptImageModalProps) {
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const lastDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const applyScale = (newScale: number) => {
    const clamped = Math.min(Math.max(newScale, 1), 5);
    scaleRef.current = clamped;
    setScale(clamped);
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastDistanceRef.current = getTouchDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistanceRef.current !== null) {
      e.preventDefault();
      const newDist = getTouchDistance(e.touches);
      const ratio = newDist / lastDistanceRef.current;
      applyScale(scaleRef.current * ratio);
      lastDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastDistanceRef.current = null;
    }

    if (e.changedTouches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        applyScale(scaleRef.current > 1 ? 1 : 2.5);
      }
      lastTapRef.current = now;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-white/60 text-xs">
          <ZoomIn size={14} />
          <span>ピンチでズーム・ダブルタップで拡大/縮小</span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="レシート画像"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: lastDistanceRef.current !== null ? 'none' : 'transform 0.2s ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          draggable={false}
        />
      </div>

      {scale > 1.05 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            {Math.round(scale * 10) / 10}×
          </span>
        </div>
      )}
    </div>
  );
}
