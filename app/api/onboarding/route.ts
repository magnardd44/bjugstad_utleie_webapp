// app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, role, phone, acceptedTermsVersion } = await req.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      company,
      role,
      phone,
      acceptedTerms: true,
      acceptedTermsAt: new Date(),
      acceptedTermsVersion,
    },
  });

  return NextResponse.json({ ok: true });
}
