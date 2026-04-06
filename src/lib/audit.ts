import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById?: string;
  ipAddress?: string;
  notes?: string;
  fieldChanges?: Record<string, { old: unknown; new: unknown }>;
  assetId?: string;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedById: params.performedById,
        ipAddress: params.ipAddress,
        notes: params.notes,
        fieldChanges: params.fieldChanges
          ? (params.fieldChanges as unknown as Prisma.InputJsonValue)
          : undefined,
        assetId: params.assetId,
      },
    });
  } catch (error) {
    // Audit log failure must never break the main operation — log to stderr
    console.error("[audit] Failed to write audit log:", error);
  }
}
