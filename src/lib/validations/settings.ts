import { z } from "zod";

export const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
