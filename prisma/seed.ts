import { AuditAction, LocationType, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Locations ────────────────────────────────────────────────────────────────

  const uruguay = await prisma.location.upsert({
    where: { id: "loc-country-uy" },
    update: {},
    create: {
      id: "loc-country-uy",
      name: "Uruguay",
      type: LocationType.COUNTRY,
      timezone: "America/Montevideo",
    },
  });

  const argentina = await prisma.location.upsert({
    where: { id: "loc-country-ar" },
    update: {},
    create: {
      id: "loc-country-ar",
      name: "Argentina",
      type: LocationType.COUNTRY,
      timezone: "America/Argentina/Buenos_Aires",
    },
  });

  const brazil = await prisma.location.upsert({
    where: { id: "loc-country-br" },
    update: {},
    create: {
      id: "loc-country-br",
      name: "Brazil",
      type: LocationType.COUNTRY,
      timezone: "America/Sao_Paulo",
    },
  });

  await prisma.location.upsert({
    where: { id: "loc-office-uy-mvd" },
    update: {},
    create: {
      id: "loc-office-uy-mvd",
      name: "Montevideo HQ",
      type: LocationType.OFFICE,
      address: "Av. 18 de Julio 1234, Montevideo",
      parentId: uruguay.id,
    },
  });

  await prisma.location.upsert({
    where: { id: "loc-office-ar-bue" },
    update: {},
    create: {
      id: "loc-office-ar-bue",
      name: "Buenos Aires Office",
      type: LocationType.OFFICE,
      address: "Av. Corrientes 5678, CABA",
      parentId: argentina.id,
    },
  });

  await prisma.location.upsert({
    where: { id: "loc-office-br-sao" },
    update: {},
    create: {
      id: "loc-office-br-sao",
      name: "São Paulo Office",
      type: LocationType.OFFICE,
      address: "Av. Paulista 910, São Paulo",
      parentId: brazil.id,
    },
  });

  console.log("  Locations created");

  // ── Users ────────────────────────────────────────────────────────────────────

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@assetcore.com" },
    update: {},
    create: {
      email: "admin@assetcore.com",
      name: "Global Admin",
      hashedPassword: await hash("Admin1234!"),
      role: "GLOBAL_ADMIN",
      isActive: true,
    },
  });

  const countryLead = await prisma.user.upsert({
    where: { email: "lead.uy@assetcore.com" },
    update: {},
    create: {
      email: "lead.uy@assetcore.com",
      name: "Laura Suárez",
      hashedPassword: await hash("Lead1234!"),
      role: "COUNTRY_LEAD",
      countryId: uruguay.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "tech.ar@assetcore.com" },
    update: {},
    create: {
      email: "tech.ar@assetcore.com",
      name: "Carlos Romero",
      hashedPassword: await hash("Tech1234!"),
      role: "TECHNICIAN",
      countryId: argentina.id,
      isActive: true,
    },
  });

  console.log("  Users created");

  // ── Asset Types ───────────────────────────────────────────────────────────────

  const notebookType = await prisma.assetType.upsert({
    where: { name: "Notebook" },
    update: {},
    create: {
      name: "Notebook",
      icon: "laptop",
      fieldSchema: {
        fields: ["processor", "ram", "storage", "os"],
      },
    },
  });

  await prisma.assetType.upsert({
    where: { name: "Monitor" },
    update: {},
    create: {
      name: "Monitor",
      icon: "monitor",
      fieldSchema: {
        fields: [],
      },
    },
  });

  await prisma.assetType.upsert({
    where: { name: "Cellphone" },
    update: {},
    create: {
      name: "Cellphone",
      icon: "smartphone",
      fieldSchema: {
        fields: ["os", "storage"],
      },
    },
  });

  console.log("  Asset types created");

  // ── Lookup Lists ──────────────────────────────────────────────────────────────

  async function upsertLookupList(
    name: string,
    label: string,
    values: { value: string; label?: string; parentValue?: string }[]
  ) {
    const list = await prisma.lookupList.upsert({
      where: { name },
      update: { label },
      create: { name, label, isSystem: true },
    });

    for (let i = 0; i < values.length; i++) {
      const { value, label: vLabel, parentValue } = values[i];

      let parentValueId: string | undefined;
      if (parentValue) {
        const parentList = await prisma.lookupList.findUnique({
          where: { name: "make" },
        });
        if (parentList) {
          const pv = await prisma.lookupValue.findUnique({
            where: { listId_value: { listId: parentList.id, value: parentValue } },
          });
          parentValueId = pv?.id;
        }
      }

      await prisma.lookupValue.upsert({
        where: { listId_value: { listId: list.id, value } },
        update: { sortOrder: i },
        create: {
          listId: list.id,
          value,
          label: vLabel ?? value,
          sortOrder: i,
          isActive: true,
          parentValueId,
        },
      });
    }

    return list;
  }

  await upsertLookupList("make", "Manufacturer", [
    { value: "Dell" },
    { value: "Lenovo" },
    { value: "HP" },
    { value: "Apple" },
    { value: "Samsung" },
    { value: "LG" },
    { value: "Logitech" },
    { value: "Microsoft" },
  ]);

  await upsertLookupList("model", "Model", [
    { value: "ThinkPad T14 Gen 4", parentValue: "Lenovo" },
    { value: "Latitude 5550", parentValue: "Dell" },
    { value: "MacBook Pro 14\"", parentValue: "Apple" },
    { value: "iPhone 15 Pro", parentValue: "Apple" },
    { value: "U2723QE", parentValue: "Dell" },
    { value: "Galaxy S24", parentValue: "Samsung" },
    { value: "EliteBook 840 G10", parentValue: "HP" },
  ]);

  await upsertLookupList("ram", "RAM", [
    { value: "4 GB DDR4" },
    { value: "8 GB DDR5" },
    { value: "16 GB DDR5" },
    { value: "32 GB DDR5" },
  ]);

  await upsertLookupList("storage", "Storage", [
    { value: "128 GB SSD" },
    { value: "256 GB NVMe" },
    { value: "512 GB NVMe" },
    { value: "1 TB NVMe" },
  ]);

  await upsertLookupList("processor", "Processor", [
    { value: "Intel Core i5-1345U" },
    { value: "Intel Core i7-1365U" },
    { value: "Apple M3" },
    { value: "Apple M3 Pro" },
  ]);

  await upsertLookupList("carrier", "Carrier", [
    { value: "DHL" },
    { value: "FedEx" },
    { value: "UPS" },
    { value: "Local Courier" },
    { value: "Internal Transfer" },
  ]);

  console.log("  Lookup lists created");

  // ── Default Workflow ──────────────────────────────────────────────────────────

  await prisma.workflow.upsert({
    where: { id: "wf-hardware-lifecycle" },
    update: {},
    create: {
      id: "wf-hardware-lifecycle",
      name: "Hardware Lifecycle",
      description: "Default lifecycle workflow for all hardware assets",
      isActive: true,
      states: [
        { name: "in_stock", label: "In Stock", color: "#6b7280", type: "initial" },
        { name: "deployed", label: "Deployed", color: "#2563eb", type: "active" },
        { name: "in_maintenance", label: "In Maintenance", color: "#f59e0b", type: "active" },
        { name: "pending_return", label: "Pending Return", color: "#8b5cf6", type: "active" },
        { name: "legal_hold", label: "Legal Hold", color: "#dc2626", type: "special" },
        { name: "retired", label: "Retired", color: "#374151", type: "terminal" },
        { name: "disposed", label: "Disposed", color: "#111827", type: "terminal" },
      ],
      transitions: [
        { from: "in_stock", to: "deployed", name: "Deploy", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"], autoActions: ["setDeployedDate", "createAssignment"] },
        { from: "in_stock", to: "in_maintenance", name: "Send to Maintenance", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"] },
        { from: "deployed", to: "pending_return", name: "Request Return", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"] },
        { from: "deployed", to: "in_stock", name: "Return", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"], autoActions: ["setReturnDate", "closeAssignment"] },
        { from: "pending_return", to: "in_stock", name: "Confirm Return", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"], autoActions: ["setReturnDate", "closeAssignment"] },
        { from: "in_maintenance", to: "in_stock", name: "Return from Maintenance", roles: ["GLOBAL_ADMIN", "COUNTRY_LEAD", "TECHNICIAN"] },
        { from: "in_stock", to: "retired", name: "Retire", roles: ["GLOBAL_ADMIN"] },
        { from: "retired", to: "disposed", name: "Dispose", roles: ["GLOBAL_ADMIN"] },
        // Legal Hold can come from any state - handled specially in code
        { from: "*", to: "legal_hold", name: "Place Legal Hold", roles: ["GLOBAL_ADMIN"], autoActions: ["storePreviousStatus"] },
        { from: "legal_hold", to: "*", name: "Release Legal Hold", roles: ["GLOBAL_ADMIN"], autoActions: ["restorePreviousStatus"] },
      ],
    },
  });

  console.log("  Default workflow created");

  // ── System Settings ───────────────────────────────────────────────────────────

  const settings = [
    { key: "app_name", value: "AssetCore", label: "Application Name", type: "string", group: "general" },
    { key: "session_timeout", value: "480", label: "Session Timeout (minutes)", type: "number", group: "auth" },
    { key: "default_timezone", value: "UTC", label: "Default Timezone", type: "string", group: "general" },
    { key: "warranty_alert_days", value: "90", label: "Warranty Alert Days", type: "number", group: "general" },
    { key: "smtp_host", value: "", label: "SMTP Host", type: "string", group: "email" },
    { key: "smtp_port", value: "587", label: "SMTP Port", type: "number", group: "email" },
    { key: "smtp_secure", value: "false", label: "SMTP Secure (TLS)", type: "boolean", group: "email" },
    { key: "smtp_user", value: "", label: "SMTP Username", type: "string", group: "email" },
    { key: "smtp_pass", value: "", label: "SMTP Password", type: "string", group: "email" },
    { key: "smtp_from", value: "", label: "From Address", type: "string", group: "email" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("  System settings created");

  // ── Role Templates ────────────────────────────────────────────────────────────

  const roleTemplates = [
    {
      id: "role-global-admin",
      name: "Global Admin",
      description: "Full unrestricted access across all countries and admin functions",
      isSystem: true,
      permissions: {
        assets: { view: true, create: true, edit: true, delete: true, changeStatus: true, export: true, import: true },
        admin: { users: true, lookups: true, workflows: true, settings: true, audit: true, roles: true },
        scope: "all" as const,
      },
    },
    {
      id: "role-country-lead",
      name: "Country Lead",
      description: "Full asset management within their assigned country",
      isSystem: true,
      permissions: {
        assets: { view: true, create: true, edit: true, delete: false, changeStatus: true, export: true, import: true },
        admin: { users: false, lookups: false, workflows: false, settings: false, audit: true, roles: false },
        scope: "own_country" as const,
      },
    },
    {
      id: "role-technician",
      name: "Technician",
      description: "Day-to-day asset operations within their assigned country",
      isSystem: true,
      permissions: {
        assets: { view: true, create: true, edit: true, delete: false, changeStatus: true, export: true, import: false },
        admin: { users: false, lookups: false, workflows: false, settings: false, audit: false, roles: false },
        scope: "own_country" as const,
      },
    },
  ];

  for (const rt of roleTemplates) {
    await prisma.roleTemplate.upsert({
      where: { id: rt.id },
      update: {},
      create: rt,
    });
  }

  console.log("  Role templates created");

  // ── Notification Rules ──────────────────────────────────────────────────────

  const WRAP_HTML = (inner: string) =>
    `<div style="font-family:system-ui,sans-serif;color:#111827;max-width:600px;margin:0 auto"><div style="background:#004346;padding:20px 24px;border-radius:12px 12px 0 0"><span style="font-size:18px;font-weight:700;color:#fff">AssetCore</span></div><div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">${inner}</div></div>`;

  const notificationRules = [
    {
      id: "notif-deploy",
      name: "Asset Deployed — Notify Assignee",
      description: "Sends an email to the user an asset is being deployed to",
      trigger: "status_change",
      conditions: { toStatus: ["DEPLOYED"] },
      recipients: { type: "assignee" },
      subject: "AssetCore — Asset deployed to you: {{asset.serialNumber}}",
      bodyHtml: WRAP_HTML(`<h2 style="margin:0 0 4px;font-size:17px">Asset Assigned to You</h2><p style="color:#6b7280;font-size:14px;margin:0 0 20px">An IT asset has been deployed and assigned to your account.</p><div style="background:#f0faf9;border:1px solid #79d9c340;border-radius:10px;padding:16px 20px;margin-bottom:20px"><p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#004346">{{asset.deviceName}}</p><p style="margin:0;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">{{asset.serialNumber}}</span></p><p style="margin:4px 0 0;font-size:12px;color:#6b7280">Model: {{asset.model}}</p></div><p style="font-size:13px;color:#374151;margin:0 0 20px">Assigned by <strong>{{performer.name}}</strong>.</p><a href="{{appUrl}}/assets" style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">View in AssetCore →</a>`),
      isActive: true,
      isSystem: true,
    },
    {
      id: "notif-legal-hold",
      name: "Legal Hold — Notify Admins",
      description: "Alerts all Global Admins when an asset is placed on legal hold",
      trigger: "status_change",
      conditions: { toStatus: ["LEGAL_HOLD"] },
      recipients: { type: "role", role: "GLOBAL_ADMIN" },
      subject: "AssetCore — ⚠ Legal Hold placed on: {{asset.serialNumber}}",
      bodyHtml: WRAP_HTML(`<h2 style="margin:0 0 4px;font-size:17px;color:#dc2626">⚠ Legal Hold Placed</h2><p style="color:#6b7280;font-size:14px;margin:0 0 20px">An asset has been placed on legal hold.</p><div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px"><p style="margin:0 0 6px;font-size:13px;font-weight:600">{{asset.deviceName}}</p><p style="margin:0;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">{{asset.serialNumber}}</span></p>{{#if notes}}<p style="margin:10px 0 0;font-size:12px;color:#6b7280;font-style:italic">"{{notes}}"</p>{{/if}}</div><p style="font-size:13px;color:#374151;margin:0 0 20px">Placed by <strong>{{performer.name}}</strong>.</p><a href="{{appUrl}}/assets" style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">View in AssetCore →</a>`),
      isActive: true,
      isSystem: true,
    },
    {
      id: "notif-maintenance",
      name: "Maintenance / Retired / Disposed — Notify Country Lead",
      description: "Notifies country leads when assets go to maintenance, retired, or disposed",
      trigger: "status_change",
      conditions: { toStatus: ["IN_MAINTENANCE", "RETIRED", "DISPOSED", "PENDING_RETURN"] },
      recipients: { type: "country_leads" },
      subject: "AssetCore — Asset status changed: {{asset.serialNumber}} → {{toStatus}}",
      bodyHtml: WRAP_HTML(`<h2 style="margin:0 0 4px;font-size:17px">Asset Status Changed</h2><p style="color:#6b7280;font-size:14px;margin:0 0 20px">An asset in your country has changed status.</p><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px"><p style="margin:0 0 8px;font-size:13px;font-weight:600">{{asset.deviceName}}</p><p style="margin:0;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">{{asset.serialNumber}}</span></p><p style="margin:8px 0 0;font-size:12px;color:#6b7280">{{fromStatus}} → <strong>{{toStatus}}</strong></p>{{#if notes}}<p style="margin:10px 0 0;font-size:12px;color:#6b7280;font-style:italic">"{{notes}}"</p>{{/if}}</div><p style="font-size:13px;color:#374151;margin:0 0 20px">Changed by <strong>{{performer.name}}</strong>.</p><a href="{{appUrl}}/assets" style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">View in AssetCore →</a>`),
      isActive: true,
      isSystem: true,
    },
    {
      id: "notif-warranty",
      name: "Warranty Expiry Alert — Notify Admins",
      description: "Daily cron: warns Global Admins about assets with warranties expiring within configured days",
      trigger: "warranty_expiry",
      conditions: {},
      recipients: { type: "role", role: "GLOBAL_ADMIN" },
      subject: "AssetCore — {{count}} warranty(ies) expiring within {{days}} days",
      bodyHtml: WRAP_HTML(`<h2 style="margin:0 0 4px;font-size:17px">Warranty Expiry Alert</h2><p style="color:#6b7280;font-size:14px;margin:0 0 20px">{{count}} asset(s) have warranties expiring within {{days}} days.</p>{{warrantyTable}}<a href="{{appUrl}}/assets" style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;margin-top:20px">View in AssetCore →</a>`),
      isActive: true,
      isSystem: true,
    },
    {
      id: "notif-asset-created",
      name: "Asset Created — Notify Country Lead",
      description: "Notifies country leads when a new asset is created in their country",
      trigger: "asset_created",
      conditions: {},
      recipients: { type: "country_leads" },
      subject: "AssetCore — New asset created: {{asset.serialNumber}}",
      bodyHtml: WRAP_HTML(`<h2 style="margin:0 0 4px;font-size:17px">New Asset Created</h2><p style="color:#6b7280;font-size:14px;margin:0 0 20px">A new asset has been registered in your country.</p><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px"><p style="margin:0 0 6px;font-size:13px;font-weight:600">{{asset.deviceName}}</p><p style="margin:0;font-size:12px;color:#6b7280">Serial: <span style="font-family:monospace;color:#111827">{{asset.serialNumber}}</span></p><p style="margin:4px 0 0;font-size:12px;color:#6b7280">Type: {{asset.type}} · Model: {{asset.model}}</p></div><p style="font-size:13px;color:#374151;margin:0 0 20px">Created by <strong>{{performer.name}}</strong>.</p><a href="{{appUrl}}/assets" style="display:inline-block;background:#004346;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">View in AssetCore →</a>`),
      isActive: false,
      isSystem: true,
    },
  ];

  for (const rule of notificationRules) {
    await prisma.notificationRule.upsert({
      where: { id: rule.id },
      update: {},
      create: rule,
    });
  }

  console.log("  Notification rules created");

  // ── Sample Assets ─────────────────────────────────────────────────────────────

  const sampleAssets = [
    { serialNumber: "SN-NB-UY-001", manufacturer: "Lenovo", model: "ThinkPad T14 Gen 4", typeId: notebookType.id, locationId: "loc-office-uy-mvd", status: "IN_STOCK" as const, condition: "GOOD" as const, ram: "16 GB DDR5", storage: "512 GB NVMe", processor: "Intel Core i7-1365U", assetTag: "NB-UY-001" },
    { serialNumber: "SN-NB-UY-002", manufacturer: "Apple", model: "MacBook Pro 14\"", typeId: notebookType.id, locationId: "loc-office-uy-mvd", status: "DEPLOYED" as const, condition: "NEW" as const, ram: "16 GB DDR5", storage: "512 GB NVMe", processor: "Apple M3 Pro", assetTag: "NB-UY-002", deployedDate: new Date("2026-01-15") },
    { serialNumber: "SN-NB-AR-001", manufacturer: "Dell", model: "Latitude 5550", typeId: notebookType.id, locationId: "loc-office-ar-bue", status: "IN_STOCK" as const, condition: "FAIR" as const, ram: "8 GB DDR5", storage: "256 GB NVMe", processor: "Intel Core i5-1345U", assetTag: "NB-AR-001" },
    { serialNumber: "SN-NB-AR-002", manufacturer: "HP", model: "EliteBook 840 G10", typeId: notebookType.id, locationId: "loc-office-ar-bue", status: "IN_MAINTENANCE" as const, condition: "DAMAGED" as const, assetTag: "NB-AR-002" },
    { serialNumber: "SN-NB-BR-001", manufacturer: "Lenovo", model: "ThinkPad T14 Gen 4", typeId: notebookType.id, locationId: "loc-office-br-sao", status: "DEPLOYED" as const, condition: "GOOD" as const, ram: "32 GB DDR5", storage: "1 TB NVMe", processor: "Intel Core i7-1365U", assetTag: "NB-BR-001", deployedDate: new Date("2026-02-01") },
  ];

  for (const asset of sampleAssets) {
    await prisma.asset.upsert({
      where: { serialNumber: asset.serialNumber },
      update: {},
      create: {
        ...asset,
        currentStatus: asset.status.toLowerCase(),
      },
    });
  }

  // Audit log for seeded assets
  for (const asset of sampleAssets) {
    const created = await prisma.asset.findUnique({ where: { serialNumber: asset.serialNumber } });
    if (created) {
      await prisma.auditLog.create({
        data: {
          entityType: "Asset",
          entityId: created.id,
          action: AuditAction.CREATE,
          assetId: created.id,
          performedById: admin.id,
          notes: "Created via seed script",
        },
      });
    }
  }

  // Seed one active assignment for DEPLOYED assets
  const deployedAssets = await prisma.asset.findMany({ where: { status: "DEPLOYED" } });
  for (const asset of deployedAssets) {
    const existing = await prisma.assignment.findFirst({ where: { assetId: asset.id, isActive: true } });
    if (!existing) {
      await prisma.assignment.create({
        data: {
          assetId: asset.id,
          assignedToId: countryLead.id,
          assignedById: admin.id,
          deployedDate: asset.deployedDate ?? new Date(),
          isActive: true,
        },
      });
    }
  }

  console.log("  Sample assets created");
  console.log("\nSeed complete!");
  console.log("\nTest credentials:");
  console.log("  admin@assetcore.com     / Admin1234!  (Global Admin)");
  console.log("  lead.uy@assetcore.com   / Lead1234!   (Country Lead - Uruguay)");
  console.log("  tech.ar@assetcore.com   / Tech1234!   (Technician - Argentina)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
