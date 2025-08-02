'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabaseClient';
import { translate } from '@/lib/translations';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');

  // Initialize language from user preference or localStorage
  useEffect(() => {
    if (user?.language) {
      setLanguageState(user.language as Language);
      localStorage.setItem('dinamiq-language', user.language);
    } else {
      const savedLanguage = localStorage.getItem('dinamiq-language') as Language;
      if (savedLanguage && ['en', 'es'].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
      }
    }
  }, [user?.language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dinamiq-language', lang);
    
    // Update user profile if logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ language: lang })
          .eq('id', user.id);
        
        if (error) {
          console.error('Failed to update language preference:', error);
        }
      } catch (error) {
        console.error('Error updating language:', error);
      }
    }
  };

  // Translation function
  const t = (key: string, options?: any): string => {
    return translate(key, language, options);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 