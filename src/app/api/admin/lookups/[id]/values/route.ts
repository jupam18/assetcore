import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLookupValueSchema } from "@/lib/validations/lookup";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const list = await prisma.lookupList.findUnique({ where: { id } });
  if (!list) return NextResponse.json({ success: false, error: "List not found" }, { status: 404 });

  const values = await prisma.lookupValue.findMany({
    where: { listId: id },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
  });

  return NextResponse.json({ success: true, data: values });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const list = await prisma.lookupList.findUnique({ where: { id } });
  if (!list) return NextResponse.json({ success: false, error: "List not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createLookupValueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.lookupValue.findUnique({
    where: { listId_value: { listId: id, value: parsed.data.value } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: "This value already exists in the list." }, { status: 422 });
  }

  // Default sortOrder: end of list
  const maxOrder = await prisma.lookupValue.aggregate({
    where: { listId: id },
    _max: { sortOrder: true },
  });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  const value = await prisma.lookupValue.create({
    data: { listId: id, ...parsed.data, sortOrder },
  });

  await auditLog({
    entityType: "LookupValue",
    entityId: value.id,
    action: "CREATE",
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    notes: `Added "${value.value}" to list "${list.name}"`,
  });

  return NextResponse.json({ success: true, data: value }, { status: 201 });
}
