import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "ADMIN";
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "USER" | "ADMIN";
    sessionVersion?: number;
  }
}
