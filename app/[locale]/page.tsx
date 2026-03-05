'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTranslations } from 'next-intl';
import VoiceInput from '@/components/voice-input/voice-input';
import LocaleSwitcher from '@/components/locale-switcher/locale-switcher';
import styles from '../page.module.css';

export default function Home() {
  const { signOut } = useAuthenticator();
  const t = useTranslations('page');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>{t('title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>
          <LocaleSwitcher />
        </div>

        <VoiceInput />

        <button onClick={signOut} className={styles.signOutLink}>
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}
