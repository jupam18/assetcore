import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PermissionsSchema = z.object({
  assets: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    changeStatus: z.boolean(),
    export: z.boolean(),
    import: z.boolean(),
  }),
  admin: z.object({
    users: z.boolean(),
    lookups: z.boolean(),
    workflows: z.boolean(),
    settings: z.boolean(),
    audit: z.boolean(),
    roles: z.boolean(),
  }),
  scope: z.enum(["own_country", "all"]),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().optional(),
  permissions: PermissionsSchema.optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const role = await prisma.roleTemplate.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ success: false, error: "Cannot modify system roles" }, { status: 422 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.roleTemplate.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.permissions !== undefined && { permissions: parsed.data.permissions as object }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const role = await prisma.roleTemplate.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 422 });
  }
  if (role._count.users > 0) {
    return NextResponse.json(
      { success: false, error: `Role is assigned to ${role._count.users} user(s). Reassign them first.` },
      { status: 422 }
    );
  }

  await prisma.roleTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
