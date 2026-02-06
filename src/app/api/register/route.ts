import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = registerSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: "Invalid registration data." },
        { status: 400 },
      );
    }

    const email = parsedBody.data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already in use." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsedBody.data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsedBody.data.name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to register user." },
      { status: 500 },
    );
  }
}
