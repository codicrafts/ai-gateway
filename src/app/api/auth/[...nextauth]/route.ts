import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import type { NextAuthOptions } from 'next-auth';

const authOptions: NextAuthOptions = {
  providers: [
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
      if (account && user.email) {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tables/users?search=${user.email}`);
          const data = await res.json();
          
          if (!data.data || data.data.length === 0) {
            const newUser = {
              id: crypto.randomUUID(),
              username: user.name || user.email.split('@')[0],
              email: user.email,
              password: '',
              balance: 5.00,
              created_at: new Date().toISOString(),
              provider: account.provider,
            };
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tables/users`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser),
            });
          }
        } catch (error) {
          console.error('Error during sign in:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; provider?: string }).id = token.id as string;
        (session.user as { id?: string; provider?: string }).provider = token.provider as string;
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
