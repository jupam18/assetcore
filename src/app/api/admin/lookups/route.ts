import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const lists = await prisma.lookupList.findMany({
    include: {
      _count: { select: { values: { where: { isActive: true } } } },
    },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({ success: true, data: lists });
}
