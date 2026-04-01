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
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("  System settings created");

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
