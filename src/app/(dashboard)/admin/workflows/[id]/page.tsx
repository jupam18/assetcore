import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { WorkflowBuilder } from "./workflow-builder";

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <WorkflowBuilder
        workflow={null}
        assetCount={0}
      />
    );
  }

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) notFound();

  const assetCount = await prisma.workflowInstance.count({ where: { workflowId: id } });

  return (
    <WorkflowBuilder
      workflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isActive: workflow.isActive,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        states: workflow.states as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transitions: workflow.transitions as any,
      }}
      assetCount={assetCount}
    />
  );
}
