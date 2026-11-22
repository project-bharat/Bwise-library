import React, { useEffect, useState } from 'react';
import { cachedCover } from '../bookMetadata';

export default function EditionCover({ isbn }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let active = true, url;
    setSrc(null);
    cachedCover(isbn).then(value => {
      url = value;
      if (active) setSrc(value);
      else if (url) URL.revokeObjectURL(url);
    }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [isbn]);
  return src && <img alt="" src={src} className="h-20 w-14 shrink-0 rounded object-contain" />;
}
