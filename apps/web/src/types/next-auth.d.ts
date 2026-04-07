import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      image?: string | null;
      provider?: string;
      newApiUserId?: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    provider?: string;
    newApiUserId?: number;
    phone?: string | null;
  }
}
