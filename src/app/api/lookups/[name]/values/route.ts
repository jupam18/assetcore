import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Public (authenticated) endpoint used by all dropdown fields
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  const { searchParams } = req.nextUrl;
  const parentValueId = searchParams.get("parentValueId");

  const list = await prisma.lookupList.findUnique({ where: { name } });
  if (!list) return NextResponse.json({ success: false, error: "Lookup list not found" }, { status: 404 });

  const values = await prisma.lookupValue.findMany({
    where: {
      listId: list.id,
      isActive: true,
      ...(parentValueId ? { parentValueId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    select: { id: true, value: true, label: true, sortOrder: true, parentValueId: true },
  });

  return NextResponse.json({ success: true, data: values });
}
