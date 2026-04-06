import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNoteSchema } from "@/lib/validations/asset";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const notes = await prisma.assetNote.findMany({
    where: { assetId: id },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Max 3 pinned notes
  if (parsed.data.isPinned) {
    const pinnedCount = await prisma.assetNote.count({
      where: { assetId: id, isPinned: true },
    });
    if (pinnedCount >= 3) {
      return NextResponse.json(
        { success: false, error: "Maximum 3 pinned notes per asset." },
        { status: 422 }
      );
    }
  }

  const note = await prisma.assetNote.create({
    data: {
      assetId: id,
      authorId: session.user.id,
      ...parsed.data,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  await auditLog({
    entityType: "AssetNote",
    entityId: note.id,
    action: "CREATE",
    assetId: id,
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
