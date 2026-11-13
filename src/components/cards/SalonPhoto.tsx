import { useState } from 'react';
import { Salon } from '../../types';

export function salonPhotos(salon: Pick<Salon, 'coverImage' | 'gallery'>) {
  const urls = [salon.coverImage, ...(salon.gallery ?? [])].filter((url): url is string => Boolean(url?.trim()));
  return [...new Set(urls)];
}

export function SalonPhoto({ name, src, className = '' }: { name: string; src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center overflow-hidden bg-accent/30 font-display text-4xl text-ink ${className}`}>
        {name.slice(0, 1)}
      </div>
    );
  }
  return <img src={src} alt={name} className={`w-full object-cover ${className}`} onError={() => setFailed(true)} />;
}
