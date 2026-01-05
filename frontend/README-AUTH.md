# Better Auth Frontend Implementation

This document provides a comprehensive guide to the Better Auth implementation in the frontend.

## 📁 Project Structure

```
frontend/src/
├── components/auth/          # Auth UI components
│   ├── SignInForm.tsx       # Email/password sign in
│   ├── SignUpForm.tsx       # User registration
│   ├── SignOutButton.tsx    # Sign out button
│   ├── UserProfile.tsx      # User profile display
│   ├── ForgotPasswordForm.tsx    # Password reset request
│   ├── ResetPasswordForm.tsx     # Password reset with token
│   ├── ChangePasswordForm.tsx    # Change password (authenticated)
│   ├── TwoFactorSetup.tsx        # 2FA setup and management
│   ├── MagicLinkForm.tsx         # Magic link authentication
│   ├── SessionManager.tsx        # Active sessions management
│   └── index.ts                  # Component exports
├── libs/
│   ├── BetterAuth.ts        # Better Auth client configuration
│   ├── AuthService.ts       # API service layer
│   ├── Env.ts              # Environment variables
│   └── hooks/              # Custom auth hooks
│       ├── useAuth.ts      # Core auth hooks
│       ├── useTwoFactor.ts # 2FA hooks
│       ├── useMagicLink.ts # Magic link hooks
│       ├── useSocialAccounts.ts # Social auth hooks
│       └── index.ts        # Hook exports
├── types/
│   └── auth.types.ts       # TypeScript types
└── validations/
    └── auth.validation.ts  # Zod validation schemas
```

## 🚀 Quick Start

### 1. Import Components

```typescript
import {
  SignInForm,
  SignUpForm,
  SignOutButton,
  UserProfile,
  ForgotPasswordForm,
  ResetPasswordForm,
  ChangePasswordForm,
  TwoFactorSetup,
  MagicLinkForm,
  SessionManager,
} from '@/components/auth';
```

### 2. Import Hooks

```typescript
import {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
  usePasswordReset,
  useUserProfile,
  useSessions,
  useEmailVerification,
  useTwoFactorSetup,
  useTwoFactorVerification,
  useMagicLink,
  useSocialAccounts,
  useSocialSignIn,
} from '@/libs/hooks';
```

### 3. Import API Service

```typescript
import { AuthService } from '@/libs/AuthService';
```

## 📖 Usage Examples

### Sign In

```typescript
'use client';

import { SignInForm } from '@/components/auth';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignInForm locale="en" />
    </div>
  );
}
```

### Sign Up

```typescript
'use client';

import { SignUpForm } from '@/components/auth';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUpForm locale="en" />
    </div>
  );
}
```

### Protected Page

```typescript
'use client';

import { useAuth } from '@/libs/hooks';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    redirect('/sign-in');
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
    </div>
  );
}
```

### User Profile

```typescript
'use client';

import { UserProfile } from '@/components/auth';

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8">
      <UserProfile />
    </div>
  );
}
```

### Password Management

```typescript
'use client';

import { ChangePasswordForm } from '@/components/auth';

export default function SecurityPage() {
  return (
    <div className="container mx-auto py-8">
      <ChangePasswordForm />
    </div>
  );
}
```

### Two-Factor Authentication

```typescript
'use client';

import { TwoFactorSetup } from '@/components/auth';
import { useAuth } from '@/libs/hooks';

export default function SecurityPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <TwoFactorSetup
        isEnabled={user?.twoFactorEnabled || false}
        onSuccess={() => {
          // Refresh user data or show success message
          window.location.reload();
        }}
      />
    </div>
  );
}
```

### Session Management

```typescript
'use client';

import { SessionManager } from '@/components/auth';

export default function SessionsPage() {
  return (
    <div className="container mx-auto py-8">
      <SessionManager />
    </div>
  );
}
```

### Magic Link Authentication

```typescript
'use client';

import { MagicLinkForm } from '@/components/auth';

export default function MagicLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <MagicLinkForm locale="en" />
    </div>
  );
}
```

## 🎣 Custom Hooks

### useAuth

Main authentication hook that provides user and session information.

```typescript
const { user, session, isLoading, isAuthenticated, error } = useAuth();
```

### useSignIn

Hook for signing in users.

```typescript
const { signInWithEmail, signInWithUsername, isLoading, error } = useSignIn();

await signInWithEmail({
  email: 'user@example.com',
  password: 'password123',
  rememberMe: true,
});
```

### useSignUp

Hook for registering new users.

```typescript
const { signUp, isLoading, error } = useSignUp();

await signUp({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
});
```

### usePasswordReset

Hook for password reset functionality.

```typescript
const { forgetPassword, resetPassword, changePassword, isLoading, error } = usePasswordReset();

// Request password reset
await forgetPassword({
  email: 'user@example.com',
  redirectTo: '/reset-password',
});

// Reset password with token
await resetPassword({
  newPassword: 'newpassword123',
  token: 'reset-token',
});

// Change password (authenticated)
await changePassword({
  currentPassword: 'oldpassword',
  newPassword: 'newpassword123',
  revokeOtherSessions: true,
});
```

### useTwoFactorSetup

Hook for setting up two-factor authentication.

```typescript
const { enableTwoFactor, disableTwoFactor, getTOTPUri, generateBackupCodes, isLoading, error } = useTwoFactorSetup();

// Enable 2FA
const response = await enableTwoFactor({
  password: 'password123',
  issuer: 'MyApp',
});
// response.totpURI - QR code URI
// response.backupCodes - Backup codes array

// Disable 2FA
await disableTwoFactor({
  password: 'password123',
});

// Generate new backup codes
const codes = await generateBackupCodes({
  password: 'password123',
});
```

### useTwoFactorVerification

Hook for verifying two-factor codes.

```typescript
const { verifyTOTP, verifyOTP, verifyBackupCode, sendOTP, isLoading, error } = useTwoFactorVerification();

// Verify TOTP code
await verifyTOTP({
  code: '123456',
  trustDevice: true,
});

// Send OTP via email
await sendOTP();

// Verify OTP code
await verifyOTP({
  code: '123456',
  trustDevice: false,
});

// Verify backup code
await verifyBackupCode({
  code: 'backup-code-123',
  trustDevice: true,
});
```

### useMagicLink

Hook for magic link authentication.

```typescript
const { sendMagicLink, verifyMagicLink, isLoading, error, emailSent } = useMagicLink();

// Send magic link
await sendMagicLink({
  email: 'user@example.com',
  name: 'John Doe', // Optional for new users
});

// Verify magic link (usually called from callback URL)
await verifyMagicLink('magic-link-token');
```

### useSessions

Hook for managing user sessions.

```typescript
const {
  sessions,
  isLoading,
  error,
  refreshSessions,
  revokeSession,
  revokeAllSessions,
  revokeOtherSessions,
} = useSessions();

// Revoke a specific session
await revokeSession('session-token');

// Revoke all sessions (signs out everywhere)
await revokeAllSessions();

// Revoke all other sessions (keep current)
await revokeOtherSessions();
```

### useSocialAccounts

Hook for managing linked social accounts.

```typescript
const { accounts, linkAccount, unlinkAccount, refreshAccounts, isLoading, error } = useSocialAccounts();

// Link a social account
await linkAccount('google', '/dashboard', ['email', 'profile']);

// Unlink a social account
await unlinkAccount('google', 'account-id');
```

### useSocialSignIn

Hook for social authentication.

```typescript
const { signInWithProvider, isLoading, error } = useSocialSignIn();

// Sign in with social provider
await signInWithProvider('google', {
  callbackURL: '/dashboard',
  scopes: ['email', 'profile'],
});
```

## 🔧 API Service

For direct API calls without hooks:

```typescript
import { AuthService } from '@/libs/AuthService';

// Sign in
const response = await AuthService.signInEmail({
  email: 'user@example.com',
  password: 'password123',
});

// Get session
const session = await AuthService.getSession();

// Sign out
await AuthService.signOut();

// All other endpoints are available
```

## 🎨 Styling

All components use Tailwind CSS classes. You can customize the styling by:

1. Modifying the component files directly
2. Using Tailwind's configuration
3. Wrapping components with your own styled containers

## 🔐 Security Best Practices

1. **Always validate on both client and server**: Client-side validation is for UX, server-side is for security
2. **Use HTTPS in production**: Never send credentials over HTTP
3. **Store tokens securely**: Better Auth handles this automatically with HTTP-only cookies
4. **Implement rate limiting**: Protect against brute force attacks
5. **Enable 2FA**: Encourage users to enable two-factor authentication
6. **Use strong password requirements**: Enforce minimum length and complexity
7. **Implement CSRF protection**: Better Auth handles this automatically

## 🐛 Troubleshooting

### Authentication not working

1. Check backend is running: `curl http://localhost:8000/api/auth/ok`
2. Verify environment variables: `NEXT_PUBLIC_BACKEND_URL`
3. Check browser cookies in DevTools
4. Verify CORS settings in backend

### Type errors

1. Ensure all types are imported from `@/types/auth.types`
2. Run `pnpm check:types` to check for TypeScript errors
3. Restart TypeScript server in your IDE

### Build errors

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
3. Check for linting errors: `pnpm lint`

## 📚 Additional Resources

- [Better Auth Documentation](https://www.better-auth.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contributing

When adding new auth features:

1. Add types to `types/auth.types.ts`
2. Add validation schemas to `validations/auth.validation.ts`
3. Add API methods to `libs/AuthService.ts`
4. Create custom hooks in `libs/hooks/`
5. Create UI components in `components/auth/`
6. Update this documentation

## 📝 License

This implementation follows the project's license.

