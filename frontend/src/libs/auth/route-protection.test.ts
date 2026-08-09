import { describe, expect, it } from 'vitest';
import {
  buildSignInRedirectUrl,
  getPathWithoutLocale,
  isPublicAuthRoute,
  requiresAuthentication,
} from './route-protection';

describe('getPathWithoutLocale', () => {
  it('strips a known locale prefix', () => {
    expect(getPathWithoutLocale('/en/people-ops/workers', ['en'])).toBe(
      '/people-ops/workers',
    );
  });

  it('leaves paths without a locale prefix unchanged', () => {
    expect(getPathWithoutLocale('/employee/home', ['en'])).toBe('/employee/home');
  });

  it('normalizes the root path', () => {
    expect(getPathWithoutLocale('/', ['en'])).toBe('/');
    expect(getPathWithoutLocale('/en', ['en'])).toBe('/');
  });
});

describe('isPublicAuthRoute', () => {
  it('allows sign-in and other guest auth pages', () => {
    expect(isPublicAuthRoute('/sign-in')).toBe(true);
    expect(isPublicAuthRoute('/sign-in/callback')).toBe(true);
    expect(isPublicAuthRoute('/sign-up')).toBe(true);
    expect(isPublicAuthRoute('/magic-link')).toBe(true);
    expect(isPublicAuthRoute('/forgot-password')).toBe(true);
    expect(isPublicAuthRoute('/reset-password')).toBe(true);
    expect(isPublicAuthRoute('/')).toBe(true);
  });

  it('rejects Polaris app routes', () => {
    expect(isPublicAuthRoute('/dashboard')).toBe(false);
    expect(isPublicAuthRoute('/employee/home')).toBe(false);
    expect(isPublicAuthRoute('/people-ops/workers')).toBe(false);
    expect(isPublicAuthRoute('/manager/cockpit')).toBe(false);
    expect(isPublicAuthRoute('/finance/pay-runs')).toBe(false);
    expect(isPublicAuthRoute('/hub')).toBe(false);
    expect(isPublicAuthRoute('/contractor/invoices')).toBe(false);
    expect(isPublicAuthRoute('/admin/setup')).toBe(false);
  });
});

describe('requiresAuthentication', () => {
  const locales = ['en'];

  it('requires auth for Polaris routes with or without locale prefix', () => {
    expect(requiresAuthentication('/people-ops/workers', locales)).toBe(true);
    expect(requiresAuthentication('/en/people-ops/workers', locales)).toBe(true);
    expect(requiresAuthentication('/employee/home', locales)).toBe(true);
    expect(requiresAuthentication('/en/manager/performance', locales)).toBe(true);
  });

  it('does not require auth for public guest routes', () => {
    expect(requiresAuthentication('/sign-in', locales)).toBe(false);
    expect(requiresAuthentication('/en/sign-in', locales)).toBe(false);
    expect(requiresAuthentication('/', locales)).toBe(false);
    expect(requiresAuthentication('/en', locales)).toBe(false);
  });
});

describe('buildSignInRedirectUrl', () => {
  it('preserves locale and sets redirect query for the original path', () => {
    const url = buildSignInRedirectUrl(
      'http://localhost:3000',
      '/en/people-ops/workers',
      ['en'],
    );

    expect(url.pathname).toBe('/en/sign-in');
    expect(url.searchParams.get('redirect')).toBe('/people-ops/workers');
  });

  it('uses default locale-less sign-in when no locale prefix is present', () => {
    const url = buildSignInRedirectUrl(
      'http://localhost:3000',
      '/employee/home',
      ['en'],
    );

    expect(url.pathname).toBe('/sign-in');
    expect(url.searchParams.get('redirect')).toBe('/employee/home');
  });
});
