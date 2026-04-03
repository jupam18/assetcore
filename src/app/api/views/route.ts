import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  columns: z.array(z.string()).min(1),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const views = await prisma.assetView.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdById: session.user.id },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      columns: true,
      isDefault: true,
      createdById: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: views });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Only admins can create default views
  if (parsed.data.isDefault && session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Only admins can create default views." }, { status: 403 });
  }

  const view = await prisma.assetView.create({
    data: {
      name: parsed.data.name,
      columns: parsed.data.columns,
      isDefault: parsed.data.isDefault ?? false,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ success: true, data: view }, { status: 201 });
}
