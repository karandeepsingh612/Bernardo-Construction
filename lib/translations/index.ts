import { en } from './en';
import { es } from './es';

const translations = { en, es };

export function translate(key: string, language: 'en' | 'es', options?: Record<string, any>): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if translation not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return original key if not found
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace parameters if options are provided
  if (options) {
    return value.replace(/\{(\w+)\}/g, (match, paramName) => {
      return options[paramName] !== undefined ? options[paramName] : match;
    });
  }
  
  return value;
}

export function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

export function validateTranslations() {
  const enKeys = getAllKeys(en);
  const esKeys = getAllKeys(es);
  
  const missingTranslations = enKeys.filter(key => !esKeys.includes(key));
  
  if (missingTranslations.length > 0) {
    console.warn('Missing Spanish translations:', missingTranslations);
  }
  
  return missingTranslations.length === 0;
} 