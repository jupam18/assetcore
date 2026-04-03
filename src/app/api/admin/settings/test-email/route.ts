import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "GLOBAL_ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const result = await sendEmail({
    to: session.user.email!,
    subject: "AssetCore — SMTP Test Email",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:32px 24px;background:#f9fafb">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#004346;padding:20px 24px">
      <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.02em">AssetCore</span>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 8px;font-size:17px;color:#111827">✅ SMTP Configuration Test</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Your SMTP settings are working correctly. AssetCore can send emails.</p>
      <p style="font-size:13px;color:#374151;margin:0">This test was triggered from the Admin → Settings panel.</p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f3f4f6;background:#f9fafb">
      <p style="margin:0;font-size:11px;color:#9ca3af">AssetCore IT Asset Management</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (result.success) {
    return NextResponse.json({ success: true, message: `Test email sent to ${session.user.email}` });
  } else {
    return NextResponse.json({ success: false, error: result.error ?? "Send failed" }, { status: 500 });
  }
}
