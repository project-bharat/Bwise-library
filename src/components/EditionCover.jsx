import React, { useEffect, useState } from 'react';
import { cachedCover } from '../bookMetadata';

export default function EditionCover({ isbn, coverData }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let active = true, url;
    setSrc(null);
    if (coverData) return;
    cachedCover(isbn).then(value => {
      url = value;
      if (active) setSrc(value);
      else if (url) URL.revokeObjectURL(url);
    }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [isbn, coverData]);
  return (coverData || src) ? <img alt="" src={coverData || src} className="h-20 w-14 shrink-0 rounded object-contain" /> : <i aria-hidden="true" className="fa-solid fa-book-open" />;
}
