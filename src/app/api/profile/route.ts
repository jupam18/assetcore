import { auditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(
  (d) => {
    // If newPassword is supplied, currentPassword must also be supplied
    if (d.newPassword && !d.currentPassword) return false;
    return true;
  },
  { message: "Current password is required to set a new password", path: ["currentPassword"] }
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      country: { select: { id: true, name: true } },
    },
  });

  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, hashedPassword: true },
  });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  // Verify current password if changing password
  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword!, user.hashedPassword);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect." },
        { status: 400 }
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (name && name !== user.name) {
    updateData.name = name;
    changes.name = { old: user.name, new: name };
  }

  if (newPassword) {
    updateData.hashedPassword = await bcrypt.hash(newPassword, 12);
    changes.password = { old: "[redacted]", new: "[redacted]" };
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true, data: { message: "No changes" } });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: updateData });

  await auditLog({
    entityType: "User",
    entityId: session.user.id,
    action: "UPDATE",
    performedById: session.user.id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    notes: "Profile updated",
    fieldChanges: changes,
  });

  return NextResponse.json({ success: true, data: { message: "Profile updated" } });
}
