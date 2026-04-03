import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  widgets: z.array(z.string()).min(1),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const views = await prisma.dashboardView.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdById: session.user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: views });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  // Only admins can create default dashboards
  const isDefault = session.user.role === "GLOBAL_ADMIN" ? (parsed.data.isDefault ?? false) : false;

  const view = await prisma.dashboardView.create({
    data: {
      name: parsed.data.name,
      widgets: parsed.data.widgets,
      isDefault,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ success: true, data: view }, { status: 201 });
}
