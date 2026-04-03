import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(["COUNTRY", "OFFICE", "ROOM"]),
  parentId: z.string().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const locations = await prisma.location.findMany({
    include: { parent: { select: { id: true, name: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ success: true, data: locations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      parentId: parsed.data.parentId ?? null,
      address: parsed.data.address ?? null,
      timezone: parsed.data.timezone ?? null,
    },
    include: { parent: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: location }, { status: 201 });
}
