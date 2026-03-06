'use client';

import { Amplify } from 'aws-amplify';
import { signIn } from 'aws-amplify/auth';
import { I18n } from 'aws-amplify/utils';
import outputs from '@/amplify_outputs.json';
import { Authenticator, ThemeProvider, Theme, TextField, View, translations } from '@aws-amplify/ui-react';
import LocaleSwitcher from '@/components/locale-switcher/locale-switcher';
import { useLocale } from 'next-intl';

Amplify.configure(outputs, { ssr: true });

I18n.putVocabularies(translations);
I18n.putVocabularies({
	hi: {
		'User does not exist. Please create an account.': 'उपयोगकर्ता मौजूद नहीं है। कृपया एक खाता बनाएँ।',
		'Create account with Email OTP': 'ईमेल ओटीपी के साथ खाता बनाएँ',
		'Sign In': 'साइन इन',
		'Sign in': 'साइन इन',
		'Signing in': 'साइन इन हो रहा है',
		'Sign in to your account': 'अपने खाते में साइन इन करें',
		'Create Account': 'खाता बनाएँ',
		'Create a new account': 'नया खाता बनाएँ',
		'Creating Account': 'खाता बनाया जा रहा है',
		'Confirm Sign Up': 'साइन अप पुष्टि करें',
		'Back to Sign In': 'साइन इन पर वापस जाएँ',
		'Email': 'ईमेल',
		'Enter your Email': 'अपना ईमेल दर्ज करें',
		'Enter your email': 'अपना ईमेल दर्ज करें',
		'Enter your code': 'अपना कोड दर्ज करें',
		'Confirm': 'पुष्टि करें',
		'Confirming': 'पुष्टि हो रही है',
		'Confirmation Code': 'पुष्टि कोड',
		'Submit': 'जमा करें',
		'Submitting': 'जमा हो रहा है',
		'Resend Code': 'कोड पुनः भेजें',
		'We Emailed You': 'हमने आपको ईमेल किया',
		'We Sent A Code': 'हमने एक कोड भेजा',
		'Your code is on the way. To log in, enter the code we emailed to': 'आपका कोड आ रहा है। लॉग इन करने के लिए, हमने जो कोड ईमेल किया है वह दर्ज करें',
		'Your code is on the way. To log in, enter the code we sent you': 'आपका कोड आ रहा है। लॉग इन करने के लिए, हमने जो कोड भेजा है वह दर्ज करें',
		'It may take a minute to arrive': 'इसमें एक मिनट लग सकता है',
		'Send code': 'कोड भेजें',
		'Send Code': 'कोड भेजें',
		'Sending': 'भेजा जा रहा है',
		'or': 'या',
		'Forgot your password?': 'पासवर्ड भूल गए?',
		'Reset your password': 'अपना पासवर्ड रीसेट करें',
		'Loading': 'लोड हो रहा है',
		'Dismiss alert': 'अलर्ट बंद करें',
	},
	ta: {
		'User does not exist. Please create an account.': 'பயனர் இல்லை. தயவுசெய்து ஒரு கணக்கை உருவாக்கவும்.',
		'Create account with Email OTP': 'மின்னஞ்சல் OTP உடன் கணக்கை உருவாக்கவும்',
		'Sign In': 'உள்நுழை',
		'Sign in': 'உள்நுழை',
		'Signing in': 'உள்நுழைகிறது',
		'Sign in to your account': 'உங்கள் கணக்கில் உள்நுழையவும்',
		'Create Account': 'கணக்கு உருவாக்கு',
		'Create a new account': 'புதிய கணக்கு உருவாக்கு',
		'Creating Account': 'கணக்கு உருவாக்கப்படுகிறது',
		'Confirm Sign Up': 'பதிவை உறுதிப்படுத்து',
		'Back to Sign In': 'உள்நுழைவுக்குத் திரும்பு',
		'Email': 'மின்னஞ்சல்',
		'Enter your Email': 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
		'Enter your email': 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
		'Enter your code': 'உங்கள் குறியீட்டை உள்ளிடவும்',
		'Confirm': 'உறுதிப்படுத்து',
		'Confirming': 'உறுதிப்படுத்தப்படுகிறது',
		'Confirmation Code': 'உறுதிப்படுத்தல் குறியீடு',
		'Submit': 'சமர்ப்பி',
		'Submitting': 'சமர்ப்பிக்கப்படுகிறது',
		'Resend Code': 'குறியீட்டை மீண்டும் அனுப்பு',
		'We Emailed You': 'நாங்கள் உங்களுக்கு மின்னஞ்சல் அனுப்பினோம்',
		'We Sent A Code': 'நாங்கள் ஒரு குறியீட்டை அனுப்பினோம்',
		'Your code is on the way. To log in, enter the code we emailed to': 'உங்கள் குறியீடு வருகிறது. உள்நுழைய, நாங்கள் மின்னஞ்சல் அனுப்பிய குறியீட்டை உள்ளிடவும்',
		'Your code is on the way. To log in, enter the code we sent you': 'உங்கள் குறியீடு வருகிறது. உள்நுழைய, நாங்கள் அனுப்பிய குறியீட்டை உள்ளிடவும்',
		'It may take a minute to arrive': 'வர ஒரு நிமிடம் ஆகலாம்',
		'Send code': 'குறியீடு அனுப்பு',
		'Send Code': 'குறியீடு அனுப்பு',
		'Sending': 'அனுப்பப்படுகிறது',
		'or': 'அல்லது',
		'Forgot your password?': 'கடவுச்சொல் மறந்துவிட்டதா?',
		'Reset your password': 'உங்கள் கடவுச்சொல்லை மீட்டமைக்கவும்',
		'Loading': 'ஏற்றுகிறது',
		'Dismiss alert': 'எச்சரிக்கையை நிராகரி',
	},
	te: {
		'User does not exist. Please create an account.': 'వినియోగదారు లేరు. దయచేసి ఖాతాను సృష్టించండి.',
		'Create account with Email OTP': 'ఇమెయిల్ OTP తో ఖాతాను సృష్టించండి',
		'Sign In': 'సైన్ ఇన్',
		'Sign in': 'సైన్ ఇన్',
		'Signing in': 'సైన్ ఇన్ అవుతోంది',
		'Sign in to your account': 'మీ ఖాతాలో సైన్ ఇన్ చేయండి',
		'Create Account': 'ఖాతా సృష్టించండి',
		'Create a new account': 'కొత్త ఖాతా సృష్టించండి',
		'Creating Account': 'ఖాతా సృష్టించబడుతోంది',
		'Confirm Sign Up': 'సైన్ అప్ నిర్ధారించండి',
		'Back to Sign In': 'సైన్ ఇన్‌కు తిరిగి వెళ్ళండి',
		'Email': 'ఇమెయిల్',
		'Enter your Email': 'మీ ఇమెయిల్ నమోదు చేయండి',
		'Enter your email': 'మీ ఇమెయిల్ నమోదు చేయండి',
		'Enter your code': 'మీ కోడ్ నమోదు చేయండి',
		'Confirm': 'నిర్ధారించండి',
		'Confirming': 'నిర్ధారిస్తోంది',
		'Confirmation Code': 'నిర్ధారణ కోడ్',
		'Submit': 'సమర్పించండి',
		'Submitting': 'సమర్పిస్తోంది',
		'Resend Code': 'కోడ్ మళ్ళీ పంపండి',
		'We Emailed You': 'మేము మీకు ఇమెయిల్ చేసాము',
		'We Sent A Code': 'మేము ఒక కోడ్ పంపాము',
		'Your code is on the way. To log in, enter the code we emailed to': 'మీ కోడ్ వస్తోంది. లాగిన్ చేయడానికి, మేము ఇమెయిల్ చేసిన కోడ్ నమోదు చేయండి',
		'Your code is on the way. To log in, enter the code we sent you': 'మీ కోడ్ వస్తోంది. లాగిన్ చేయడానికి, మేము పంపిన కోడ్ నమోదు చేయండి',
		'It may take a minute to arrive': 'రావడానికి ఒక నిమిషం పట్టవచ్చు',
		'Send code': 'కోడ్ పంపండి',
		'Send Code': 'కోడ్ పంపండి',
		'Sending': 'పంపుతోంది',
		'or': 'లేదా',
		'Forgot your password?': 'పాస్‌వర్డ్ మర్చిపోయారా?',
		'Reset your password': 'మీ పాస్‌వర్డ్‌ను రీసెట్ చేయండి',
		'Loading': 'లోడ్ అవుతోంది',
		'Dismiss alert': 'హెచ్చరికను తీసివేయండి',
	},
	kn: {
		'User does not exist. Please create an account.': 'ಬಳಕೆದಾರರು ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಖಾತೆಯನ್ನು ರಚಿಸಿ.',
		'Create account with Email OTP': 'ಇಮೇಲ್ OTP ಯೊಂದಿಗೆ ಖಾತೆಯನ್ನು ರಚಿಸಿ',
		'Sign In': 'ಸೈನ್ ಇನ್',
		'Sign in': 'ಸೈನ್ ಇನ್',
		'Signing in': 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ',
		'Sign in to your account': 'ನಿಮ್ಮ ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ',
		'Create Account': 'ಖಾತೆ ರಚಿಸಿ',
		'Create a new account': 'ಹೊಸ ಖಾತೆ ರಚಿಸಿ',
		'Creating Account': 'ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ',
		'Confirm Sign Up': 'ಸೈನ್ ಅಪ್ ಖಚಿತಪಡಿಸಿ',
		'Back to Sign In': 'ಸೈನ್ ಇನ್‌ಗೆ ಹಿಂತಿರುಗಿ',
		'Email': 'ಇಮೇಲ್',
		'Enter your Email': 'ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ',
		'Enter your email': 'ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ',
		'Enter your code': 'ನಿಮ್ಮ ಕೋಡ್ ನಮೂದಿಸಿ',
		'Confirm': 'ಖಚಿತಪಡಿಸಿ',
		'Confirming': 'ಖಚಿತಪಡಿಸಲಾಗುತ್ತಿದೆ',
		'Confirmation Code': 'ಖಚಿತಪಡಿಸುವ ಕೋಡ್',
		'Submit': 'ಸಲ್ಲಿಸಿ',
		'Submitting': 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ',
		'Resend Code': 'ಕೋಡ್ ಮರುಕಳುಹಿಸಿ',
		'We Emailed You': 'ನಾವು ನಿಮಗೆ ಇಮೇಲ್ ಕಳುಹಿಸಿದ್ದೇವೆ',
		'We Sent A Code': 'ನಾವು ಒಂದು ಕೋಡ್ ಕಳುಹಿಸಿದ್ದೇವೆ',
		'Your code is on the way. To log in, enter the code we emailed to': 'ನಿಮ್ಮ ಕೋಡ್ ಬರುತ್ತಿದೆ. ಲಾಗಿನ್ ಆಗಲು, ನಾವು ಇಮೇಲ್ ಮಾಡಿದ ಕೋಡ್ ನಮೂದಿಸಿ',
		'Your code is on the way. To log in, enter the code we sent you': 'ನಿಮ್ಮ ಕೋಡ್ ಬರುತ್ತಿದೆ. ಲಾಗಿನ್ ಆಗಲು, ನಾವು ಕಳುಹಿಸಿದ ಕೋಡ್ ನಮೂದಿಸಿ',
		'It may take a minute to arrive': 'ಬರಲು ಒಂದು ನಿಮಿಷ ಬೇಕಾಗಬಹುದು',
		'Send code': 'ಕೋಡ್ ಕಳುಹಿಸಿ',
		'Send Code': 'ಕೋಡ್ ಕಳುಹಿಸಿ',
		'Sending': 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ',
		'or': 'ಅಥವಾ',
		'Forgot your password?': 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
		'Reset your password': 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ',
		'Loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ',
		'Dismiss alert': 'ಎಚ್ಚರಿಕೆ ತಳ್ಳಿಹಾಕಿ',
	},
	ml: {
		'User does not exist. Please create an account.': 'ഉപയോക്താവ് നിലവിലില്ല. ദയവായി ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക.',
		'Create account with Email OTP': 'ഇമെയിൽ OTP ഉപയോഗിച്ച് അക്കൗണ്ട് സൃഷ്ടിക്കുക',
		'Sign In': 'സൈൻ ഇൻ',
		'Sign in': 'സൈൻ ഇൻ',
		'Signing in': 'സൈൻ ഇൻ ചെയ്യുന്നു',
		'Sign in to your account': 'നിങ്ങളുടെ അക്കൗണ്ടിൽ സൈൻ ഇൻ ചെയ്യുക',
		'Create Account': 'അക്കൗണ്ട് സൃഷ്ടിക്കുക',
		'Create a new account': 'പുതിയ അക്കൗണ്ട് സൃഷ്ടിക്കുക',
		'Creating Account': 'അക്കൗണ്ട് സൃഷ്ടിക്കുന്നു',
		'Confirm Sign Up': 'സൈൻ അപ്പ് സ്ഥിരീകരിക്കുക',
		'Back to Sign In': 'സൈൻ ഇന്നിലേക്ക് മടങ്ങുക',
		'Email': 'ഇമെയിൽ',
		'Enter your Email': 'നിങ്ങളുടെ ഇമെയിൽ നൽകുക',
		'Enter your email': 'നിങ്ങളുടെ ഇമെയിൽ നൽകുക',
		'Enter your code': 'നിങ്ങളുടെ കോഡ് നൽകുക',
		'Confirm': 'സ്ഥിരീകരിക്കുക',
		'Confirming': 'സ്ഥിരീകരിക്കുന്നു',
		'Confirmation Code': 'സ്ഥിരീകരണ കോഡ്',
		'Submit': 'സമർപ്പിക്കുക',
		'Submitting': 'സമർപ്പിക്കുന്നു',
		'Resend Code': 'കോഡ് വീണ്ടും അയയ്ക്കുക',
		'We Emailed You': 'ഞങ്ങൾ നിങ്ങൾക്ക് ഇമെയിൽ അയച്ചു',
		'We Sent A Code': 'ഞങ്ങൾ ഒരു കോഡ് അയച്ചു',
		'Your code is on the way. To log in, enter the code we emailed to': 'നിങ്ങളുടെ കോഡ് വരുന്നു. ലോഗിൻ ചെയ്യാൻ, ഞങ്ങൾ ഇമെയിൽ ചെയ്ത കോഡ് നൽകുക',
		'Your code is on the way. To log in, enter the code we sent you': 'നിങ്ങളുടെ കോഡ് വരുന്നു. ലോഗിൻ ചെയ്യാൻ, ഞങ്ങൾ അയച്ച കോഡ് നൽകുക',
		'It may take a minute to arrive': 'എത്തിച്ചേരാൻ ഒരു മിനിറ്റ് എടുത്തേക്കാം',
		'Send code': 'കോഡ് അയയ്ക്കുക',
		'Send Code': 'കോഡ് അയയ്ക്കുക',
		'Sending': 'അയയ്ക്കുന്നു',
		'or': 'അല്ലെങ്കിൽ',
		'Forgot your password?': 'പാസ്‌വേഡ് മറന്നോ?',
		'Reset your password': 'നിങ്ങളുടെ പാസ്‌വേഡ് പുനഃസജ്ജമാക്കുക',
		'Loading': 'ലോഡ് ചെയ്യുന്നു',
		'Dismiss alert': 'അലേർട്ട് തള്ളിക്കളയുക',
	},
	bn: {
		'User does not exist. Please create an account.': 'ব্যবহারকারীর অস্তিত্ব নেই। অনুগ্রহ করে একটি অ্যাকাউন্ট তৈরি করুন।',
		'Create account with Email OTP': 'ইমেল OTP দিয়ে অ্যাকাউন্ট তৈরি করুন',
		'Sign In': 'সাইন ইন',
		'Sign in': 'সাইন ইন',
		'Signing in': 'সাইন ইন হচ্ছে',
		'Sign in to your account': 'আপনার অ্যাকাউন্টে সাইন ইন করুন',
		'Create Account': 'অ্যাকাউন্ট তৈরি করুন',
		'Create a new account': 'নতুন অ্যাকাউন্ট তৈরি করুন',
		'Creating Account': 'অ্যাকাউন্ট তৈরি হচ্ছে',
		'Confirm Sign Up': 'সাইন আপ নিশ্চিত করুন',
		'Back to Sign In': 'সাইন ইনে ফিরে যান',
		'Email': 'ইমেইল',
		'Enter your Email': 'আপনার ইমেইল লিখুন',
		'Enter your email': 'আপনার ইমেইল লিখুন',
		'Enter your code': 'আপনার কোড লিখুন',
		'Confirm': 'নিশ্চিত করুন',
		'Confirming': 'নিশ্চিত হচ্ছে',
		'Confirmation Code': 'নিশ্চিতকরণ কোড',
		'Submit': 'জমা দিন',
		'Submitting': 'জমা হচ্ছে',
		'Resend Code': 'কোড পুনরায় পাঠান',
		'We Emailed You': 'আমরা আপনাকে ইমেইল করেছি',
		'We Sent A Code': 'আমরা একটি কোড পাঠিয়েছি',
		'Your code is on the way. To log in, enter the code we emailed to': 'আপনার কোড আসছে। লগ ইন করতে, আমরা যে কোড ইমেইল করেছি তা লিখুন',
		'Your code is on the way. To log in, enter the code we sent you': 'আপনার কোড আসছে। লগ ইন করতে, আমরা যে কোড পাঠিয়েছি তা লিখুন',
		'It may take a minute to arrive': 'আসতে এক মিনিট সময় লাগতে পারে',
		'Send code': 'কোড পাঠান',
		'Send Code': 'কোড পাঠান',
		'Sending': 'পাঠানো হচ্ছে',
		'or': 'অথবা',
		'Forgot your password?': 'পাসওয়ার্ড ভুলে গেছেন?',
		'Reset your password': 'আপনার পাসওয়ার্ড রিসেট করুন',
		'Loading': 'লোড হচ্ছে',
		'Dismiss alert': 'সতর্কতা বাতিল করুন',
	},
	mr: {
		'User does not exist. Please create an account.': 'वापरकर्ता अस्तित्वात नाही. कृपया एक खाते तयार करा.',
		'Create account with Email OTP': 'ईमेल OTP सह खाते तयार करा',
		'Sign In': 'साइन इन',
		'Sign in': 'साइन इन',
		'Signing in': 'साइन इन होत आहे',
		'Sign in to your account': 'आपल्या खात्यात साइन इन करा',
		'Create Account': 'खाते तयार करा',
		'Create a new account': 'नवीन खाते तयार करा',
		'Creating Account': 'खाते तयार होत आहे',
		'Confirm Sign Up': 'साइन अप पुष्टी करा',
		'Back to Sign In': 'साइन इनवर परत जा',
		'Email': 'ईमेल',
		'Enter your Email': 'आपला ईमेल प्रविष्ट करा',
		'Enter your email': 'आपला ईमेल प्रविष्ट करा',
		'Enter your code': 'आपला कोड प्रविष्ट करा',
		'Confirm': 'पुष्टी करा',
		'Confirming': 'पुष्टी होत आहे',
		'Confirmation Code': 'पुष्टीकरण कोड',
		'Submit': 'सबमिट करा',
		'Submitting': 'सबमिट होत आहे',
		'Resend Code': 'कोड पुन्हा पाठवा',
		'We Emailed You': 'आम्ही तुम्हाला ईमेल केला',
		'We Sent A Code': 'आम्ही एक कोड पाठवला',
		'Your code is on the way. To log in, enter the code we emailed to': 'तुमचा कोड येत आहे. लॉग इन करण्यासाठी, आम्ही ईमेल केलेला कोड प्रविष्ट करा',
		'Your code is on the way. To log in, enter the code we sent you': 'तुमचा कोड येत आहे. लॉग इन करण्यासाठी, आम्ही पाठवलेला कोड प्रविष्ट करा',
		'It may take a minute to arrive': 'येण्यास एक मिनिट लागू शकतो',
		'Send code': 'कोड पाठवा',
		'Send Code': 'कोड पाठवा',
		'Sending': 'पाठवले जात आहे',
		'or': 'किंवा',
		'Forgot your password?': 'पासवर्ड विसरलात?',
		'Reset your password': 'आपला पासवर्ड रीसेट करा',
		'Loading': 'लोड होत आहे',
		'Dismiss alert': 'सूचना बंद करा',
	},
	gu: {
		'User does not exist. Please create an account.': 'વપરાશકર્તા અસ્તિત્વમાં નથી. કૃપા કરીને ખાતું બનાવો.',
		'Create account with Email OTP': 'ઈમેલ OTP સાથે ખાતું બનાવો',
		'Sign In': 'સાઇન ઇન',
		'Sign in': 'સાઇન ઇન',
		'Signing in': 'સાઇન ઇન થઈ રહ્યું છે',
		'Sign in to your account': 'તમારા ખાતામાં સાઇન ઇન કરો',
		'Create Account': 'ખાતું બનાવો',
		'Create a new account': 'નવું ખાતું બનાવો',
		'Creating Account': 'ખાતું બનાવવામાં આવી રહ્યું છે',
		'Confirm Sign Up': 'સાઇન અપ ખાતરી કરો',
		'Back to Sign In': 'સાઇન ઇન પર પાછા જાઓ',
		'Email': 'ઈમેલ',
		'Enter your Email': 'તમારો ઈમેલ દાખલ કરો',
		'Enter your email': 'તમારો ઈમેલ દાખલ કરો',
		'Enter your code': 'તમારો કોડ દાખલ કરો',
		'Confirm': 'ખાતરી કરો',
		'Confirming': 'ખાતરી થઈ રહી છે',
		'Confirmation Code': 'ખાતરી કોડ',
		'Submit': 'સબમિટ કરો',
		'Submitting': 'સબમિટ થઈ રહ્યું છે',
		'Resend Code': 'કોડ ફરીથી મોકલો',
		'We Emailed You': 'અમે તમને ઈમેલ કર્યો',
		'We Sent A Code': 'અમે એક કોડ મોકલ્યો',
		'Your code is on the way. To log in, enter the code we emailed to': 'તમારો કોડ આવી રહ્યો છે. લૉગ ઇન કરવા, અમે ઈમેલ કરેલો કોડ દાખલ કરો',
		'Your code is on the way. To log in, enter the code we sent you': 'તમારો કોડ આવી રહ્યો છે. લૉગ ઇન કરવા, અમે મોકલેલો કોડ દાખલ કરો',
		'It may take a minute to arrive': 'આવવામાં એક મિનિટ લાગી શકે છે',
		'Send code': 'કોડ મોકલો',
		'Send Code': 'કોડ મોકલો',
		'Sending': 'મોકલવામાં આવી રહ્યું છે',
		'or': 'અથવા',
		'Forgot your password?': 'પાસવર્ડ ભૂલી ગયા?',
		'Reset your password': 'તમારો પાસવર્ડ રીસેટ કરો',
		'Loading': 'લોડ થઈ રહ્યું છે',
		'Dismiss alert': 'ચેતવણી બંધ કરો',
	},
	pa: {
		'User does not exist. Please create an account.': 'ਉਪਭੋਗਤਾ ਮੌਜੂਦ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਖਾਤਾ ਬਣਾਓ।',
		'Create account with Email OTP': 'ਈਮੇਲ OTP ਨਾਲ ਖਾਤਾ ਬਣਾਓ',
		'Sign In': 'ਸਾਈਨ ਇਨ',
		'Sign in': 'ਸਾਈਨ ਇਨ',
		'Signing in': 'ਸਾਈਨ ਇਨ ਹੋ ਰਿਹਾ ਹੈ',
		'Sign in to your account': 'ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਸਾਈਨ ਇਨ ਕਰੋ',
		'Create Account': 'ਖਾਤਾ ਬਣਾਓ',
		'Create a new account': 'ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ',
		'Creating Account': 'ਖਾਤਾ ਬਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ',
		'Confirm Sign Up': 'ਸਾਈਨ ਅੱਪ ਪੁਸ਼ਟੀ ਕਰੋ',
		'Back to Sign In': 'ਸਾਈਨ ਇਨ ਤੇ ਵਾਪਸ ਜਾਓ',
		'Email': 'ਈਮੇਲ',
		'Enter your Email': 'ਆਪਣਾ ਈਮੇਲ ਦਰਜ ਕਰੋ',
		'Enter your email': 'ਆਪਣਾ ਈਮੇਲ ਦਰਜ ਕਰੋ',
		'Enter your code': 'ਆਪਣਾ ਕੋਡ ਦਰਜ ਕਰੋ',
		'Confirm': 'ਪੁਸ਼ਟੀ ਕਰੋ',
		'Confirming': 'ਪੁਸ਼ਟੀ ਹੋ ਰਹੀ ਹੈ',
		'Confirmation Code': 'ਪੁਸ਼ਟੀ ਕੋਡ',
		'Submit': 'ਜਮ੍ਹਾਂ ਕਰੋ',
		'Submitting': 'ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ',
		'Resend Code': 'ਕੋਡ ਦੁਬਾਰਾ ਭੇਜੋ',
		'We Emailed You': 'ਅਸੀਂ ਤੁਹਾਨੂੰ ਈਮੇਲ ਕੀਤਾ',
		'We Sent A Code': 'ਅਸੀਂ ਇੱਕ ਕੋਡ ਭੇਜਿਆ',
		'Your code is on the way. To log in, enter the code we emailed to': 'ਤੁਹਾਡਾ ਕੋਡ ਆ ਰਿਹਾ ਹੈ। ਲੌਗ ਇਨ ਕਰਨ ਲਈ, ਅਸੀਂ ਜੋ ਕੋਡ ਈਮੇਲ ਕੀਤਾ ਉਹ ਦਰਜ ਕਰੋ',
		'Your code is on the way. To log in, enter the code we sent you': 'ਤੁਹਾਡਾ ਕੋਡ ਆ ਰਿਹਾ ਹੈ। ਲੌਗ ਇਨ ਕਰਨ ਲਈ, ਅਸੀਂ ਜੋ ਕੋਡ ਭੇਜਿਆ ਉਹ ਦਰਜ ਕਰੋ',
		'It may take a minute to arrive': 'ਆਉਣ ਵਿੱਚ ਇੱਕ ਮਿੰਟ ਲੱਗ ਸਕਦਾ ਹੈ',
		'Send code': 'ਕੋਡ ਭੇਜੋ',
		'Send Code': 'ਕੋਡ ਭੇਜੋ',
		'Sending': 'ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ',
		'or': 'ਜਾਂ',
		'Forgot your password?': 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?',
		'Reset your password': 'ਆਪਣਾ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ',
		'Loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ',
		'Dismiss alert': 'ਚੇਤਾਵਨੀ ਬੰਦ ਕਰੋ',
	},
});

const theme: Theme = {
	name: 'glass-theme',
	tokens: {
		colors: {
			background: {
				primary: { value: 'transparent' },
				secondary: { value: 'transparent' },
			},
			border: {
				primary: { value: 'rgba(255,255,255,0.12)' },
				secondary: { value: 'rgba(255,255,255,0.08)' },
				focus: { value: 'rgba(165,180,252,0.6)' },
				error: { value: 'rgba(251,146,60,0.5)' },
			},
			font: {
				primary: { value: 'rgba(255,255,255,0.95)' },
				secondary: { value: 'rgba(255,255,255,0.6)' },
				tertiary: { value: 'rgba(255,255,255,0.4)' },
				interactive: { value: 'rgba(199,210,254,0.9)' },
				error: { value: 'rgba(251,191,146,0.95)' },
			},
		},
		radii: {
			small: { value: '12px' },
			medium: { value: '16px' },
			large: { value: '20px' },
		},
		components: {
			authenticator: {
				router: {
					borderWidth: { value: '0' },
					boxShadow: { value: 'none' },
					backgroundColor: { value: 'rgba(255,255,255,0.06)' },
				},
			},
			button: {
				primary: {
					backgroundColor: { value: 'rgba(99,102,241,0.8)' },
					color: { value: '#ffffff' },
					borderColor: { value: 'rgba(165,180,252,0.2)' },
					_hover: {
						backgroundColor: { value: 'rgba(99,102,241,0.95)' },
						color: { value: '#ffffff' },
						borderColor: { value: 'rgba(165,180,252,0.4)' },
					},
					_active: {
						backgroundColor: { value: 'rgba(79,82,221,1)' },
						color: { value: '#ffffff' },
					},
					_focus: {
						backgroundColor: { value: 'rgba(99,102,241,0.95)' },
						color: { value: '#ffffff' },
					},
				},
				link: {
					color: { value: 'rgba(165,180,252,0.8)' },
					_hover: {
						backgroundColor: { value: 'transparent' },
						color: { value: 'rgba(199,210,254,1)' },
					},
				},
			},
			tabs: {
				item: {
					color: { value: 'rgba(255,255,255,0.45)' },
					borderColor: { value: 'transparent' },
					_hover: {
						color: { value: 'rgba(255,255,255,0.7)' },
					},
					_active: {
						color: { value: 'rgba(199,210,254,0.95)' },
						borderColor: { value: 'rgba(165,180,252,0.7)' },
					},
				},
			},
			fieldcontrol: {
				borderColor: { value: 'rgba(255,255,255,0.12)' },
				color: { value: 'rgba(255,255,255,0.95)' },
				_focus: {
					borderColor: { value: 'rgba(165,180,252,0.5)' },
					boxShadow: { value: '0 0 0 3px rgba(165,180,252,0.12)' },
				},
				_error: {
					borderColor: { value: 'rgba(251,146,60,0.5)' },
					color: { value: 'rgba(255,255,255,0.95)' },
					_focus: {
						boxShadow: { value: '0 0 0 2px rgba(251,146,60,0.15)' },
					},
				},
			},
		},
	},
};

export default function AuthenticatorWrapper({ children }: { children: React.ReactNode }) {
	const locale = useLocale();

	I18n.setLanguage(locale);

	return (
		<ThemeProvider theme={theme}>
			<Authenticator
				passwordless={{
					preferredAuthMethod: 'EMAIL_OTP',
					hiddenAuthMethods: ['PASSWORD', 'SMS_OTP', 'WEB_AUTHN'],
				}}
				services={{
					async handleSignIn(input) {
						try {
							const response = await signIn(input);
							if (
								response.nextStep?.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION' &&
								!response.nextStep?.availableChallenges?.includes('EMAIL_OTP')
							) {
								const error = new Error(I18n.get('User does not exist. Please create an account.'));
								error.name = 'UserNotFoundException';
								throw error;
							}
							return response;
						} catch (error) {
							const err = error as Error;
							if (
								err.name === 'UserNotFoundException' ||
								err.name === 'NotAuthorizedException' ||
								err.name === 'EmptySignInPassword'
							) {
								const newError = new Error(I18n.get('User does not exist. Please create an account.'));
								newError.name = 'UserNotFoundException';
								throw newError;
							}
							throw error;
						}
					},
				}}
				components={{
					Header() {
						return (
							<div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
								<LocaleSwitcher />
							</div>
						);
					},
					SignIn: {
						Footer() {
							return null;
						},
					},
					SignUp: {
						FormFields() {
							return (
								<TextField
									name="email"
									label={I18n.get('Email')}
									placeholder={I18n.get('Enter your email')}
									type="email"
									isRequired
									autoComplete="email"
								/>
							);
						},
					},
				}}
			>
				{children}
			</Authenticator>
		</ThemeProvider>
	);
}
