'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Amplify } from 'aws-amplify';
import {
  signIn,
  signUp,
  confirmSignIn,
  confirmSignUp,
  getCurrentUser,
  signOut,
  autoSignIn,
} from 'aws-amplify/auth';
import outputs from '@/amplify_outputs.json';
import styles from './wrapper.module.css';

Amplify.configure(outputs, { ssr: true });

type AuthStep = 'phone' | 'otp';
type AuthMode = 'signIn' | 'signUp';

function PhoneAuthUI({ onAuthenticated }: { onAuthenticated: () => void }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fullPhoneNumber = phone.startsWith('+') ? phone : `+91${phone}`;

  const handleSendOtp = useCallback(async () => {
    setError('');
    setLoading(true);

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError(t('invalidPhone'));
      setLoading(false);
      return;
    }

    try {
      const { nextStep } = await signIn({
        username: fullPhoneNumber,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'SMS_OTP',
        },
      });

      console.log('signIn nextStep:', JSON.stringify(nextStep));
      setMode('signIn');
      if (
        nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' ||
        (nextStep.signInStep as string) === 'CONFIRM_SIGN_IN_WITH_OTP'
      ) {
        setStep('otp');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors('somethingWentWrong');

      if (message.includes('not found') || message.includes('UserNotFoundException')) {
        try {
          const { nextStep } = await signUp({
            username: fullPhoneNumber,
            options: {
              userAttributes: {
                phone_number: fullPhoneNumber,
              },
              autoSignIn: {
                authFlowType: 'USER_AUTH',
              },
            },
          });

          setMode('signUp');
          if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            setStep('otp');
          }
        } catch (signUpErr: unknown) {
          const signUpMessage =
            signUpErr instanceof Error ? signUpErr.message : tErrors('somethingWentWrong');
          setError(signUpMessage);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [phone, fullPhoneNumber, t, tErrors]);

  const handleVerifyOtp = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'signUp') {
        await confirmSignUp({
          username: fullPhoneNumber,
          confirmationCode: otp,
        });

        try {
          await autoSignIn();
        } catch {
          await signIn({
            username: fullPhoneNumber,
            options: {
              authFlowType: 'USER_AUTH',
              preferredChallenge: 'SMS_OTP',
            },
          });
        }
        onAuthenticated();
      } else {
        const { nextStep } = await confirmSignIn({
          challengeResponse: otp,
        });

        if (nextStep.signInStep === 'DONE') {
          onAuthenticated();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors('invalidCode');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [otp, fullPhoneNumber, mode, onAuthenticated, tErrors]);

  const otpLength = mode === 'signUp' ? 6 : 8;

  return (
    <div className={styles.authContainer}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.title}>{t('signInTitle')}</h2>
          <p className={styles.subtitle}>{t('signInSubtitle')}</p>
        </div>

        <div className={styles.form}>
          {step === 'phone' && (
            <>
              <div>
                <label className={styles.label}>{t('phoneLabel')}</label>
                <div className={styles.phoneRow}>
                  <div className={styles.dialCode}>+91</div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={t('phonePlaceholder')}
                    maxLength={10}
                    className={styles.input}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
                className={styles.primaryButton}
              >
                {loading ? t('sendingOtp') : t('continue')}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div>
                <p className={styles.otpSentText}>
                  {t('codeSentTo')} <span className={styles.otpPhone}>+91 {phone}</span>
                </p>
                <label className={styles.label} style={{ marginTop: '16px' }}>
                  {t('enterOtp')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('otpPlaceholder', { length: otpLength })}
                  maxLength={otpLength}
                  className={`${styles.input} ${styles.otpInput}`}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  autoFocus
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < otpLength}
                className={styles.primaryButton}
              >
                {loading ? t('verifying') : t('verifyAndContinue')}
              </button>

              <button
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className={styles.switchLink}
                style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem' }}
              >
                {t('changePhone')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthenticatorWrapper({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'authenticated'>(
    'loading'
  );

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthState('authenticated'))
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  if (authState === 'loading') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <PhoneAuthUI onAuthenticated={() => setAuthState('authenticated')} />;
  }

  return <>{children}</>;
}
