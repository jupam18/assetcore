// ── Email HTML templates ────────────────────────────────────────────────────

const BASE = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:32px 24px;background:#f9fafb">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#004346;padding:20px 24px;display:flex;align-items:center;gap:12px">
      <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.02em">AssetCore</span>
    </div>
    <div style="padding:24px">
      ${content}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f3f4f6;background:#f9fafb">
      <p style="margin:0;font-size:11px;color:#9ca3af">This is an automated message from AssetCore. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

const PILL = (text: string, color: string) =>
  `<span style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${color}20;color:${color}">${text}</span>`;

const STATUS_COLOR: Record<string, string> = {
  IN_STOCK: "#6b7280",
  DEPLOYED: "#004346",
  IN_MAINTENANCE: "#d97706",
  PENDING_RETURN: "#7c3aed",
  LEGAL_HOLD: "#dc2626",
  RETIRED: "#374151",
  DISPOSED: "#111827",
};

const STATUS_LABEL: Record<string, string> = {
  IN_STOCK: "In Stock",
  DEPLOYED: "Deployed",
  IN_MAINTENANCE: "In Maintenance",
  PENDING_RETURN: "Pending Return",
  LEGAL_HOLD: "Legal Hold",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

type AssetInfo = {
  serialNumber: string;
  model: string;
  assetTag?: string | null;
  deviceName?: string | null;
};

export function deploymentEmailHtml({
  asset,
  assigneeName,
  performedByName,
  appUrl,
}: {
  asset: AssetInfo;
  assigneeName: string;
  performedByName: string;
  appUrl: string;
}) {
  const label = asset.deviceName || asset.assetTag || `${asset.model}`;
  return BASE(`
    <h2 style="margin:0 0 4px;font-size:17px;font-weight:600;color:#111827">Asset Assigned to You</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">An IT asset has been deployed and assigned to your account.</p>

    <div style="background:#f0faf9;border:1px solid #79d9c340;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#004346">${label}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">${asset.serialNumber}</span></p>
      ${asset.assetTag ? `<p style="margin:0 0 4px;font-size:12px;color:#6b7280">Asset Tag: <span style="color:#111827">${asset.assetTag}</span></p>` : ""}
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280">Status: ${PILL("Deployed", STATUS_COLOR.DEPLOYED)}</p>
    </div>

    <p style="font-size:13px;color:#374151;margin:0 0 20px">
      Assigned by <strong>${performedByName}</strong>. If this assignment was made in error, please contact your IT administrator.
    </p>

    <a href="${appUrl}/assets"
      style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
      View in AssetCore →
    </a>
  `);
}

export function statusChangeEmailHtml({
  asset,
  fromStatus,
  toStatus,
  performedByName,
  notes,
  appUrl,
}: {
  asset: AssetInfo;
  fromStatus: string;
  toStatus: string;
  performedByName: string;
  notes?: string | null;
  appUrl: string;
}) {
  const label = asset.deviceName || asset.assetTag || asset.model;
  const from = STATUS_LABEL[fromStatus] ?? fromStatus;
  const to = STATUS_LABEL[toStatus] ?? toStatus;
  const toColor = STATUS_COLOR[toStatus] ?? "#6b7280";

  return BASE(`
    <h2 style="margin:0 0 4px;font-size:17px;font-weight:600;color:#111827">Asset Status Changed</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">An asset you manage has changed status.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">${label}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">${asset.serialNumber}</span></p>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:#6b7280">
        <span>${PILL(from, STATUS_COLOR[fromStatus] ?? "#6b7280")}</span>
        <span style="color:#9ca3af">→</span>
        <span>${PILL(to, toColor)}</span>
      </div>
      ${notes ? `<p style="margin:10px 0 0;font-size:12px;color:#6b7280;font-style:italic">"${notes}"</p>` : ""}
    </div>

    <p style="font-size:13px;color:#374151;margin:0 0 20px">
      Changed by <strong>${performedByName}</strong>.
    </p>

    <a href="${appUrl}/assets"
      style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
      View in AssetCore →
    </a>
  `);
}

export function legalHoldEmailHtml({
  asset,
  placedByName,
  notes,
  appUrl,
}: {
  asset: AssetInfo;
  placedByName: string;
  notes?: string | null;
  appUrl: string;
}) {
  const label = asset.deviceName || asset.assetTag || asset.model;
  return BASE(`
    <h2 style="margin:0 0 4px;font-size:17px;font-weight:600;color:#dc2626">⚠ Legal Hold Placed</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">An asset has been placed on legal hold. No actions can be taken on it until released by an administrator.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">${label}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">${asset.serialNumber}</span></p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280">Status: ${PILL("Legal Hold", "#dc2626")}</p>
      ${notes ? `<p style="margin:10px 0 0;font-size:12px;color:#6b7280;font-style:italic">"${notes}"</p>` : ""}
    </div>

    <p style="font-size:13px;color:#374151;margin:0 0 20px">
      Placed by <strong>${placedByName}</strong>.
    </p>

    <a href="${appUrl}/assets"
      style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">
      View in AssetCore →
    </a>
  `);
}
