import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  states: z.array(z.object({
    name: z.string(),
    label: z.string(),
    color: z.string(),
    type: z.enum(["initial", "active", "special", "terminal"]),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  })).optional(),
  transitions: z.array(z.object({
    from: z.string(),
    to: z.string(),
    name: z.string(),
    roles: z.array(z.string()),
    autoActions: z.array(z.string()).optional(),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: workflow });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  // If activating this workflow, deactivate all others
  if (parsed.data.isActive === true) {
    await prisma.workflow.updateMany({ data: { isActive: false } });
  }

  const updated = await prisma.workflow.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: parsed.data as any,
  });

  return NextResponse.json({ success: true, data: updated });
}
