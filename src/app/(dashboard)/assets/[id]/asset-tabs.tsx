"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetType, Location } from "@prisma/client";
import { InfoTab } from "./info-tab";
import { LogisticsTab } from "./logistics-tab";
import { AuditTab } from "./audit-tab";
import { NotesTab } from "./notes-tab";

type LookupOption = { id: string; value: string };
type LocationWithParent = Location & { parent: Location | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AssetTabs({ asset, assetTypes, locations, users, makeValues, ramValues, storageValues, processorValues, carrierValues, userRole, userId }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any;
  assetTypes: AssetType[];
  locations: LocationWithParent[];
  users: { id: string; name: string; email: string }[];
  makeValues: LookupOption[];
  ramValues: LookupOption[];
  storageValues: LookupOption[];
  processorValues: LookupOption[];
  carrierValues: LookupOption[];
  userRole: string;
  userId: string;
}) {
  return (
    <Tabs defaultValue="info" className="space-y-4">
      <TabsList className="bg-gray-100">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="logistics">Logistics</TabsTrigger>
        <TabsTrigger value="audit">Audit Log</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <InfoTab
          asset={asset}
          assetTypes={assetTypes}
          locations={locations}
          users={users}
          makeValues={makeValues}
          ramValues={ramValues}
          storageValues={storageValues}
          processorValues={processorValues}
          userRole={userRole}
        />
      </TabsContent>

      <TabsContent value="logistics">
        <LogisticsTab asset={asset} carrierValues={carrierValues} />
      </TabsContent>

      <TabsContent value="audit">
        <AuditTab assetId={asset.id} />
      </TabsContent>

      <TabsContent value="notes">
        <NotesTab assetId={asset.id} userRole={userRole} userId={userId} />
      </TabsContent>
    </Tabs>
  );
}
