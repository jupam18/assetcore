import nodemailer from "nodemailer";
import { prisma } from "./prisma";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from"] } },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (!map["smtp_host"] || !map["smtp_user"] || !map["smtp_pass"]) return null;

  return {
    host: map["smtp_host"],
    port: parseInt(map["smtp_port"] ?? "587", 10),
    secure: map["smtp_secure"] === "true",
    user: map["smtp_user"],
    pass: map["smtp_pass"],
    from: map["smtp_from"] ?? `AssetCore <${map["smtp_user"]}>`,
  };
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = await getSmtpConfig();
  if (!config) return { success: false, error: "SMTP not configured" };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  try {
    await transporter.sendMail({ from: config.from, to, subject, html });
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Send failed";
    console.error("[email] Send failed:", msg);
    return { success: false, error: msg };
  }
}

export function warrantyAlertHtml(assets: { serialNumber: string; model: string; warrantyExpiry: string; location: string }[]) {
  const rows = assets
    .map(
      (a) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-family:monospace;font-size:13px">${a.serialNumber}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${a.model}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${a.warrantyExpiry}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px">${a.location}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:680px;margin:0 auto;padding:24px">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Warranty Expiry Alert</h2>
  <p style="color:#6b7280;font-size:14px;margin-bottom:24px">
    The following ${assets.length} asset${assets.length !== 1 ? "s have" : " has"} warranties expiring within 90 days.
  </p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Serial</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Model</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Expires</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Location</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#9ca3af">Sent by AssetCore — do not reply to this email.</p>
</body>
</html>`;
}
