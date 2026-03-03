'use client';

import { useState, useCallback, useEffect } from 'react';
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
// Internal mode tracked automatically — user never picks this
type AuthMode = 'signIn' | 'signUp';


function PhoneAuthUI({ onAuthenticated }: { onAuthenticated: () => void }) {
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
			setError('Please enter a valid phone number');
			setLoading(false);
			return;
		}

		try {
			// Always try signIn first
			const { nextStep } = await signIn({
				username: fullPhoneNumber,
				options: {
					authFlowType: 'USER_AUTH',
					preferredChallenge: 'SMS_OTP',
				},
			});

			setMode('signIn');
			if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
				setStep('otp');
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Something went wrong';

			// User doesn't exist — auto sign up
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
					const signUpMessage = signUpErr instanceof Error ? signUpErr.message : 'Something went wrong';
					setError(signUpMessage);
				}
			} else {
				setError(message);
			}
		} finally {
			setLoading(false);
		}
	}, [phone, fullPhoneNumber]);

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
			const message = err instanceof Error ? err.message : 'Invalid code';
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [otp, fullPhoneNumber, mode, onAuthenticated]);

	const otpLength = mode === 'signUp' ? 6 : 8;

	return (
		<div className={styles.authContainer}>
			<div className={styles.card}>
				<div className={styles.cardHeader}>
					<h2 className={styles.title}>Sign In</h2>
					<p className={styles.subtitle}>Enter your phone number to continue</p>
				</div>

				<div className={styles.form}>
					{step === 'phone' && (
						<>
							<div>
								<label className={styles.label}>Phone Number</label>
								<div className={styles.phoneRow}>
									<div className={styles.dialCode}>+91</div>
									<input
										type="tel"
										value={phone}
										onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
										placeholder="Enter mobile number"
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
								{loading ? 'Sending OTP...' : 'Continue'}
							</button>
						</>
					)}

					{step === 'otp' && (
						<>
							<div>
								<p className={styles.otpSentText}>
									Code sent to <span className={styles.otpPhone}>+91 {phone}</span>
								</p>
								<label className={styles.label} style={{ marginTop: '16px' }}>Enter OTP</label>
								<input
									type="text"
									inputMode="numeric"
									value={otp}
									onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
									placeholder={`Enter ${otpLength}-digit code...`}
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
								{loading ? 'Verifying...' : 'Verify & Continue'}
							</button>

							<button
								onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
								className={styles.switchLink}
								style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem' }}
							>
								Change phone number
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default function AuthenticatorWrapper({ children }: { children: React.ReactNode }) {
	const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');

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
