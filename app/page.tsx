'use client';

import { signOut } from 'aws-amplify/auth';
import VoiceInput from '@/components/voice-input/voice-input';
import styles from './page.module.css';

export default function Home() {
  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Clinical Copilot</h1>
        <p className={styles.subtitle}>Dictate or type clinical notes with live transcription</p>

        <VoiceInput />

        <button onClick={handleSignOut} className={styles.signOutLink}>
          Sign out
        </button>
      </div>
    </div>
  );
}
