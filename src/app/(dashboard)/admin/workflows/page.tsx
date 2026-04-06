import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Workflow } from "lucide-react";

export default async function WorkflowsPage() {
  const workflows = await prisma.workflow.findMany({ orderBy: { createdAt: "asc" } });

  const counts = await Promise.all(
    workflows.map((wf) => prisma.workflowInstance.count({ where: { workflowId: wf.id } }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define state machines that drive asset lifecycle transitions.
          </p>
        </div>
        <Link
          href="/admin/workflows/new"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand-800 text-white text-sm font-medium transition-all hover:bg-brand-900 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </Link>
      </div>

      <div className="grid gap-4">
        {workflows.map((wf, i) => {
          const states = (wf.states as { name: string; type: string; label: string }[]) ?? [];
          const transitions = (wf.transitions as { name: string }[]) ?? [];
          return (
            <Link
              key={wf.id}
              href={`/admin/workflows/${wf.id}`}
              className="flex items-center gap-5 bg-card border border-border rounded-xl px-6 py-5 hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wf.isActive ? "bg-brand-100 text-brand-800" : "bg-muted text-muted-foreground"}`}>
                <Workflow className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground group-hover:text-brand-800 transition-colors">{wf.name}</h2>
                  {wf.isActive && (
                    <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Active
                    </span>
                  )}
                </div>
                {wf.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{wf.description}</p>}
              </div>
              <div className="flex items-center gap-6 text-sm shrink-0">
                <div className="text-center">
                  <div className="font-bold text-foreground">{states.length}</div>
                  <div className="text-xs text-muted-foreground">states</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground">{transitions.length}</div>
                  <div className="text-xs text-muted-foreground">transitions</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground">{counts[i]}</div>
                  <div className="text-xs text-muted-foreground">assets</div>
                </div>
              </div>
            </Link>
          );
        })}

        {workflows.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Workflow className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No workflows yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
