"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";
import VoiceInput from "@/components/voice-input/voice-input";

export default function Home() {
  const { signOut } = useAuthenticator();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Clinical Copilot</h1>
        <p style={styles.subtitle}>
          Dictate or type clinical notes with live transcription
        </p>

        <VoiceInput />

        <button onClick={signOut} style={styles.signOutLink}>
          Sign out
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background:
      "radial-gradient(ellipse at 20% 50%, rgba(88, 28, 135, 0.35), transparent 60%), " +
      "radial-gradient(ellipse at 80% 20%, rgba(30, 58, 138, 0.4), transparent 55%), " +
      "radial-gradient(ellipse at 60% 80%, rgba(49, 46, 129, 0.3), transparent 55%), " +
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    width: "100%",
    maxWidth: "640px",
  },
  heading: {
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "rgba(255, 255, 255, 0.95)",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "rgba(255, 255, 255, 0.5)",
    margin: 0,
  },
  signOutLink: {
    background: "transparent",
    border: "none",
    color: "rgba(165, 180, 252, 0.7)",
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: "8px 0",
    fontWeight: 500,
    marginTop: "8px",
  },
};
