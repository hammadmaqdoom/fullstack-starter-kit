/**
 * Two-Factor Authentication Setup Component
 * 
 * Allows users to enable/disable 2FA and manage backup codes.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  enableTwoFactorSchema,
  disableTwoFactorSchema,
  verifyTOTPSchema,
  generateBackupCodesSchema,
  type EnableTwoFactorFormData,
  type DisableTwoFactorFormData,
  type VerifyTOTPFormData,
  type GenerateBackupCodesFormData,
} from '@/validations/auth.validation';
import { useTwoFactorSetup, useTwoFactorVerification } from '@/libs/hooks';
// QR Code will be displayed as a link that can be opened in authenticator apps

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onSuccess?: () => void;
}

export function TwoFactorSetup({ isEnabled, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'initial' | 'qr-code' | 'verify' | 'backup-codes'>('initial');
  const [totpUri, setTotpUri] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { enableTwoFactor, disableTwoFactor, generateBackupCodes, isLoading, error } = useTwoFactorSetup();
  const { verifyTOTP, isLoading: isVerifying, error: verifyError } = useTwoFactorVerification();

  // Enable 2FA Form
  const enableForm = useForm<EnableTwoFactorFormData>({
    resolver: zodResolver(enableTwoFactorSchema),
  });

  // Disable 2FA Form
  const disableForm = useForm<DisableTwoFactorFormData>({
    resolver: zodResolver(disableTwoFactorSchema),
  });

  // Verify TOTP Form
  const verifyForm = useForm<VerifyTOTPFormData>({
    resolver: zodResolver(verifyTOTPSchema),
    defaultValues: {
      trustDevice: false,
    },
  });

  // Generate Backup Codes Form
  const backupForm = useForm<GenerateBackupCodesFormData>({
    resolver: zodResolver(generateBackupCodesSchema),
  });

  const handleEnable = async (data: EnableTwoFactorFormData) => {
    try {
      const response = await enableTwoFactor(data);
      setTotpUri(response.totpURI);
      setBackupCodes(response.backupCodes);
      setStep('qr-code');
    } catch (err) {
      console.error('Failed to enable 2FA:', err);
    }
  };

  const handleVerify = async (data: VerifyTOTPFormData) => {
    try {
      await verifyTOTP(data);
      setStep('backup-codes');
      onSuccess?.();
    } catch (err) {
      console.error('Failed to verify TOTP:', err);
    }
  };

  const handleDisable = async (data: DisableTwoFactorFormData) => {
    try {
      await disableTwoFactor(data);
      setStep('initial');
      onSuccess?.();
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    }
  };

  const handleGenerateBackupCodes = async (data: GenerateBackupCodesFormData) => {
    try {
      const response = await generateBackupCodes(data);
      setBackupCodes(response.backupCodes);
    } catch (err) {
      console.error('Failed to generate backup codes:', err);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
  };

  // Initial state - Enable or Disable 2FA
  if (step === 'initial') {
    if (isEnabled) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold">Two-Factor Authentication Enabled</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account is protected with two-factor authentication.
            </p>
            
            <form onSubmit={disableForm.handleSubmit(handleDisable)} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error.message}</p>
                </div>
              )}
              
              <div>
                <label htmlFor="disable-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  {...disableForm.register('password')}
                  id="disable-password"
                  type="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {disableForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {disableForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </form>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700">Generate New Backup Codes</h4>
              <form onSubmit={backupForm.handleSubmit(handleGenerateBackupCodes)} className="mt-2 space-y-4">
                <div>
                  <input
                    {...backupForm.register('password')}
                    type="password"
                    placeholder="Enter password"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Generate New Codes
                </button>
              </form>

              {backupCodes.length > 0 && (
                <div className="mt-4">
                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium">Backup Codes</h5>
                      <button
                        onClick={copyBackupCodes}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Copy All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="rounded bg-white p-2">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Enable Two-Factor Authentication</h3>
          <p className="mt-2 text-sm text-gray-600">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          
          <form onSubmit={enableForm.handleSubmit(handleEnable)} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error.message}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="enable-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...enableForm.register('password')}
                id="enable-password"
                type="password"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {enableForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {enableForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Enabling...' : 'Enable 2FA'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // QR Code step
  if (step === 'qr-code') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <p className="mt-2 text-sm text-gray-600">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Or manually enter this code in your authenticator app:
            </p>
            <div className="rounded-md bg-gray-50 p-4">
              <code className="text-sm break-all">{totpUri}</code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(totpUri)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Copy to clipboard
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setStep('verify')}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verify step
  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Verify Code</h3>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app to verify.
          </p>
          
          <form onSubmit={verifyForm.handleSubmit(handleVerify)} className="mt-4 space-y-4">
            {verifyError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{verifyError.message}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                {...verifyForm.register('code')}
                id="code"
                type="text"
                maxLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="000000"
              />
              {verifyForm.formState.errors.code && (
                <p className="mt-1 text-sm text-red-600">
                  {verifyForm.formState.errors.code.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Backup codes step
  if (step === 'backup-codes') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Save Your Backup Codes</h3>
          <p className="mt-2 text-sm text-gray-600">
            Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>
          
          <div className="mt-4 rounded-md bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium">Backup Codes</h5>
              <button
                onClick={copyBackupCodes}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Copy All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="rounded bg-white p-2">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setStep('initial')}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

