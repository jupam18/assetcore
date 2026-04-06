import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  columns: z.array(z.string()).min(1).optional(),
  isDefault: z.boolean().optional(),
});

async function getViewAndCheck(id: string, userId: string, role: string) {
  const view = await prisma.assetView.findUnique({ where: { id } });
  if (!view) return { view: null, error: "Not found", status: 404 };
  const isOwner = view.createdById === userId;
  const isAdmin = role === "GLOBAL_ADMIN";
  if (!isOwner && !isAdmin) return { view: null, error: "Forbidden", status: 403 };
  return { view, error: null, status: 200 };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { view, error, status } = await getViewAndCheck(id, session.user.id, session.user.role);
  if (!view) return NextResponse.json({ success: false, error }, { status });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Only admins can change isDefault
  if (parsed.data.isDefault !== undefined && session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Only admins can set default views." }, { status: 403 });
  }

  const updated = await prisma.assetView.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { view, error, status } = await getViewAndCheck(id, session.user.id, session.user.role);
  if (!view) return NextResponse.json({ success: false, error }, { status });

  await prisma.assetView.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
