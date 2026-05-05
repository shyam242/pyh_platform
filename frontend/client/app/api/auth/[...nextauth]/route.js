import NextAuth from "next-auth";
import LinkedInProvider from "next-auth/providers/linkedin";

const handler = NextAuth({
  providers: [
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ profile }) {
      // Send login details to backend
      await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          linkedinId: profile.sub,
          image: profile.picture,
          provider: "linkedin",
        }),
      });

      return true;
    },

    async jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.email = token.email;
      session.user.name = token.name;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
