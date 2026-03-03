import { ComingSoon } from "@/components/ComingSoon";
import { Coffee } from "lucide-react";

export default function GhostOrdersPage() {
  return (
    <ComingSoon
      title="Ghost Orders"
      description="View and manage white-label orders assigned to you through the Ghost Roaster programme."
      icon={Coffee}
    />
  );
}
