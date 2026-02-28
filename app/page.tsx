'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import VoiceInput from '@/components/voice-input/voice-input';
import { PAGE_TITLE, PAGE_SUBTITLE, SIGN_OUT_LABEL } from '@/constants/ui-strings';
import styles from './page.module.css';

export default function Home() {
  // const { signOut } = useAuthenticator();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{PAGE_TITLE}</h1>
        <p className={styles.subtitle}>{PAGE_SUBTITLE}</p>

        <VoiceInput />

        {/* <button onClick={signOut} className={styles.signOutLink}>
          {SIGN_OUT_LABEL}
        </button> */}
      </div>
    </div>
  );
}
