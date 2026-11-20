import { useEffect, useState } from 'react';
import { getLanguage, setLanguage, subscribeLanguage, t as translate } from './index';

/** React hook for components as they migrate to resource-key localization. */
export function useTranslation() {
  const [language, setCurrentLanguage] = useState(getLanguage);

  useEffect(() => subscribeLanguage(setCurrentLanguage), []);

  const t = (key, params = {}) => translate(key, params, language);
  return { language, t, changeLanguage: setLanguage };
}
