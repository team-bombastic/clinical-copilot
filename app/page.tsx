'use client';

import { useTranslations } from 'next-intl';
import { signOut } from 'aws-amplify/auth';
import VoiceInput from '@/components/voice-input/voice-input';
import styles from './page.module.css';

export default function Home() {
  const t = useTranslations('page');

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>

        <VoiceInput />

        <button onClick={handleSignOut} className={styles.signOutLink}>
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}
