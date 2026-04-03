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

const CreateSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().optional(),
  permissions: PermissionsSchema,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.roleTemplate.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: roles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const role = await prisma.roleTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: parsed.data.permissions as object,
    },
  });

  return NextResponse.json({ success: true, data: role }, { status: 201 });
}
