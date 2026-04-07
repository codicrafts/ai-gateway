import type { NextAuthOptions } from 'next-auth';
import { randomBytes } from 'crypto';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  authenticateLocalUser,
  createLocalUser,
  ensureNewApiLink,
  getAppUserByEmail,
  getAppUserByPhone,
  getAppUserById,
  sanitizeAppUser,
  upsertOAuthUser,
} from '@/services/account/app-user.service';
import { verifyEmailVerificationCode } from '@/services/account/email-auth.service';
import { normalizePhoneForAuth, verifyPhoneVerificationCode } from '@/services/account/phone-auth.service';
import { verifyTwoFactorChallenge } from '@/services/account/two-factor.service';
import { isPhoneIdentifier, validateEmail, validatePassword } from '@/utils/helpers';

function buildUsernameFromIdentifier(identifier: string): string {
  if (isPhoneIdentifier(identifier)) {
    const normalizedPhone = normalizePhoneForAuth(identifier);
    return `user_${normalizedPhone.slice(-4)}`;
  }

  const emailLocalPart = identifier.split('@')[0]?.trim();
  return emailLocalPart || `user_${Date.now().toString().slice(-6)}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
        code: { label: 'Verification code', type: 'text' },
        totp: { label: '2FA code', type: 'text' },
        recoveryCode: { label: 'Recovery code', type: 'text' },
        authMethod: { label: 'Auth method', type: 'text' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;
        const code = credentials?.code?.trim();
        const totp = credentials?.totp?.trim();
        const recoveryCode = credentials?.recoveryCode?.trim();
        const authMethod = credentials?.authMethod === 'code' ? 'code' : 'password';

        if (!identifier) {
          return null;
        }

        if (authMethod === 'code') {
          if (!code) {
            return null;
          }

          const isPhone = isPhoneIdentifier(identifier);
          const isEmail = validateEmail(identifier);

          if (!isPhone && !isEmail) {
            return null;
          }

          if (isPhone) {
            await verifyPhoneVerificationCode(identifier, 'auth', code);
            const existing = await getAppUserByPhone(identifier);

            if (existing) {
              const linked = await ensureNewApiLink(existing);
              const user = sanitizeAppUser(linked);
              return {
                id: user.id,
                email: user.email ?? undefined,
                phone: user.phone ?? undefined,
                name: user.name || user.username,
                image: user.image,
                provider: 'credentials',
                newApiUserId: user.new_api_user_id ?? undefined,
              };
            }

            const created = await createLocalUser({
              phone: normalizePhoneForAuth(identifier),
              username: buildUsernameFromIdentifier(identifier),
              password: randomBytes(16).toString('hex'),
              balance: 5.0,
            });

            return {
              id: created.id,
              email: created.email ?? undefined,
              phone: created.phone ?? undefined,
              name: created.name || created.username,
              image: created.image,
              provider: 'credentials',
              newApiUserId: created.new_api_user_id ?? undefined,
            };
          }

          await verifyEmailVerificationCode(identifier, 'auth', code);
          const existing = await getAppUserByEmail(identifier);

          if (existing) {
            const linked = await ensureNewApiLink(existing);
            const user = sanitizeAppUser(linked);
            return {
              id: user.id,
              email: user.email ?? undefined,
              phone: user.phone ?? undefined,
              name: user.name || user.username,
              image: user.image,
              provider: 'credentials',
              newApiUserId: user.new_api_user_id ?? undefined,
            };
          }

          const created = await createLocalUser({
            email: identifier,
            username: buildUsernameFromIdentifier(identifier),
            password: randomBytes(16).toString('hex'),
            balance: 5.0,
          });

          return {
            id: created.id,
            email: created.email ?? undefined,
            phone: created.phone ?? undefined,
            name: created.name || created.username,
            image: created.image,
            provider: 'credentials',
            newApiUserId: created.new_api_user_id ?? undefined,
          };
        }

        if (!password) {
          return null;
        }

        const existing = isPhoneIdentifier(identifier)
          ? await getAppUserByPhone(identifier)
          : validateEmail(identifier)
            ? await getAppUserByEmail(identifier)
            : null;

        if (existing) {
          const user = await authenticateLocalUser(identifier, password);
          if (!user) {
            return null;
          }

          const freshUser = await getAppUserById(user.id);
          if (
            freshUser?.two_factor_enabled &&
            !verifyTwoFactorChallenge(freshUser, { totpCode: totp, recoveryCode })
          ) {
            throw new Error('需要双因素认证');
          }

          return {
            id: user.id,
            email: user.email ?? undefined,
            phone: user.phone ?? undefined,
            name: user.name || user.username,
            image: user.image,
            provider: 'credentials',
            newApiUserId: user.new_api_user_id ?? undefined,
          };
        }

        if (!validatePassword(password)) {
          return null;
        }

        const created = await createLocalUser({
          email: validateEmail(identifier) ? identifier : null,
          phone: isPhoneIdentifier(identifier) ? normalizePhoneForAuth(identifier) : null,
          username: buildUsernameFromIdentifier(identifier),
          password,
          balance: 5.0,
        });

        return {
          id: created.id,
          email: created.email ?? undefined,
          phone: created.phone ?? undefined,
          name: created.name || created.username,
          image: created.image,
          provider: 'credentials',
          newApiUserId: created.new_api_user_id ?? undefined,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account && user.email && account.provider !== 'credentials') {
        const appUser = await upsertOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
        });

        user.id = appUser.id;
        user.name = appUser.name || appUser.username;
        user.image = appUser.image;
        (user as typeof user & { provider?: string; newApiUserId?: number }).provider = account.provider;
        (user as typeof user & { provider?: string; newApiUserId?: number }).newApiUserId = appUser.new_api_user_id ?? undefined;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.provider = account?.provider || (user as typeof user & { provider?: string }).provider;
        token.newApiUserId = (user as typeof user & { newApiUserId?: number }).newApiUserId;
        token.phone = (user as typeof user & { phone?: string | null }).phone ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string | undefined;
        session.user.newApiUserId = token.newApiUserId as number | undefined;
        session.user.phone = (token.phone as string | null | undefined) ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
