'use client';

import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';
import { Authenticator, ThemeProvider, Theme, TextField } from '@aws-amplify/ui-react';

Amplify.configure(outputs, { ssr: true });

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
  return (
    <ThemeProvider theme={theme}>
      <Authenticator
        passwordless={{
          preferredAuthMethod: 'EMAIL_OTP',
          hiddenAuthMethods: ['PASSWORD', 'SMS_OTP', 'WEB_AUTHN'],
        }}
        components={{
          SignUp: {
            FormFields() {
              return (
                <TextField
                  name="email"
                  label="Email"
                  placeholder="Enter your email"
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
