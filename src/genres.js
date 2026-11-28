import genres from './genres.json';
import { getLanguage } from './i18n';

export const catalogCategories = Object.keys(genres);
const legacy = {
  'Self-Help': ['स्व-विकास', 'स्वयं सहायता'], Finance: ['अर्थकारण', 'वित्त'],
  History: ['इतिहास', 'इतिहास'], Literature: ['साहित्य', 'साहित्य'],
  Technology: ['तंत्रज्ञान', 'प्रौद्योगिकी'], Philosophy: ['तत्त्वज्ञान', 'दर्शन'],
  Science: ['विज्ञान', 'विज्ञान'], Fiction: ['काल्पनिक साहित्य', 'कथा साहित्य']
};
export function categoryLabel(value, language = getLanguage()) {
  if (language === 'en') return value;
  return genres[value]?.[language] || legacy[value]?.[language === 'mr' ? 0 : 1] || value;
}
