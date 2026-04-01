import { z } from "zod";

export const createAssetSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required").max(100).toUpperCase().trim(),
  assetTag: z.string().max(100).optional().nullable(),
  deviceName: z.string().max(200).optional().nullable(),
  typeId: z.string().min(1, "Asset type is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  condition: z.enum(["NEW", "GOOD", "FAIR", "DAMAGED", "FOR_PARTS"]),
  locationId: z.string().min(1, "Location is required"),
  os: z.string().max(200).optional().nullable(),
  processor: z.string().max(200).optional().nullable(),
  ram: z.string().max(200).optional().nullable(),
  storage: z.string().max(200).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateAssetSchema = createAssetSchema
  .omit({ serialNumber: true })
  .partial();

export const statusTransitionSchema = z.object({
  toStatus: z.enum([
    "IN_STOCK",
    "DEPLOYED",
    "IN_MAINTENANCE",
    "PENDING_RETURN",
    "LEGAL_HOLD",
    "RETIRED",
    "DISPOSED",
  ]),
  assignedToId: z.string().optional(), // Required when transitioning to DEPLOYED
  notes: z.string().max(1000).optional(),
});

export const createNoteSchema = z.object({
  text: z.string().min(1, "Note text is required").max(10000),
  category: z.enum(["GENERAL", "MAINTENANCE", "INCIDENT", "TRANSFER", "PROCUREMENT"]).optional(),
  visibility: z.enum(["ALL_USERS", "COUNTRY_LEADS_ONLY", "ADMINS_ONLY"]).optional(),
  isPinned: z.boolean().optional(),
});

export const createShipmentSchema = z.object({
  trackingNumber: z.string().max(200).optional().nullable(),
  carrier: z.string().max(100).optional().nullable(),
  originLocation: z.string().max(500).optional().nullable(),
  destLocation: z.string().max(500).optional().nullable(),
  shipmentDate: z.string().optional().nullable(),
  expectedDelivery: z.string().optional().nullable(),
  poNumber: z.string().max(100).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  customsRef: z.string().max(200).optional().nullable(),
  transferNotes: z.string().max(2000).optional().nullable(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
