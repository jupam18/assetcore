import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const stateSchema = z.object({
  name: z.string(),
  label: z.string(),
  color: z.string(),
  type: z.enum(["initial", "active", "special", "terminal"]),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const transitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  autoActions: z.array(z.string()).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  states: z.array(stateSchema).min(1),
  transitions: z.array(transitionSchema),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Attach usage counts
  const counts = await Promise.all(
    workflows.map((wf) => prisma.workflowInstance.count({ where: { workflowId: wf.id } }))
  );

  const data = workflows.map((wf, i) => ({ ...wf, assetCount: counts[i] }));
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      states: parsed.data.states,
      transitions: parsed.data.transitions,
      isActive: false, // new workflows start inactive
    },
  });

  return NextResponse.json({ success: true, data: workflow }, { status: 201 });
}
