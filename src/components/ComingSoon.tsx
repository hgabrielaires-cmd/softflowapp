import { AppLayout } from "@/components/AppLayout";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  module: string;
}

export function ComingSoon({ title, description, module }: ComingSoonProps) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-2xl gradient-brand flex items-center justify-center mb-4">
          <Construction className="h-8 w-8 text-white" />
        </div>
        <span className="text-xs font-semibold text-emerald uppercase tracking-wider mb-2">{module}</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground max-w-sm">{description}</p>
      </div>
    </AppLayout>
  );
}
