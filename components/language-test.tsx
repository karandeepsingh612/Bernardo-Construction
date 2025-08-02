'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LanguageTest() {
  const { t, language } = useLanguage();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Language Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Current Language:</strong> {language}
        </div>
        <div>
          <strong>Dashboard Title:</strong> {t('dashboard.title')}
        </div>
        <div>
          <strong>Dashboard Subtitle:</strong> {t('dashboard.subtitle')}
        </div>
        <div>
          <strong>Total Submitted:</strong> {t('dashboard.stats.totalSubmitted')}
        </div>
        <div>
          <strong>Sign In:</strong> {t('auth.signIn')}
        </div>
        <div>
          <strong>Save:</strong> {t('common.save')}
        </div>
      </CardContent>
    </Card>
  );
} 