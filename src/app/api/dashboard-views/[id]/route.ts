import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  widgets: z.array(z.string()).min(1).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const view = await prisma.dashboardView.findUnique({ where: { id } });
  if (!view) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const isOwner = view.createdById === session.user.id;
  const isAdmin = session.user.role === "GLOBAL_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.dashboardView.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.widgets !== undefined && { widgets: parsed.data.widgets }),
      ...(parsed.data.isDefault !== undefined && isAdmin && { isDefault: parsed.data.isDefault }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const view = await prisma.dashboardView.findUnique({ where: { id } });
  if (!view) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const isOwner = view.createdById === session.user.id;
  const isAdmin = session.user.role === "GLOBAL_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.dashboardView.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
