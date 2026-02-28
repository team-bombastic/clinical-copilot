'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import VoiceInput from '@/components/voice-input/voice-input';
import styles from './page.module.css';

export default function Home() {
  const { signOut } = useAuthenticator();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Clinical Copilot</h1>
        <p className={styles.subtitle}>Dictate or type clinical notes with live transcription</p>

        <VoiceInput />

        <button onClick={signOut} className={styles.signOutLink}>
          Sign out
        </button>
      </div>
    </div>
  );
}
