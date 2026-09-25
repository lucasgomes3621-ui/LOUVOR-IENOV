import React, { useState } from 'react';
import { Music } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
}

export const IENOV_LOGO_SRC = '/ienov-logo.png';
export const IENOV_LOGO_REMOTE_SRC =
  'https://plain-enam-prod-public.komododecks.com/202609/23/5RYT7gNqakHgWoSTfuqF/image.png';

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-contain',
  fallbackClassName = 'w-5 h-5 text-indigo-500',
  alt = 'LOUVOR IENOV',
}) => {
  const [src, setSrc] = useState<string>(IENOV_LOGO_SRC);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (src === IENOV_LOGO_SRC) {
      // Try direct remote CDN
      setSrc(IENOV_LOGO_REMOTE_SRC);
    } else {
      // Both failed, fallback to icon
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Music className={fallbackClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      onError={handleError}
    />
  );
};
