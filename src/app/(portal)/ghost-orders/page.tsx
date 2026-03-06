import { ComingSoon } from "@/components/ComingSoon";
import { Coffee } from "@/components/icons";

export default function GhostOrdersPage() {
  return (
    <ComingSoon
      title="Ghost Orders"
      description="View and manage white-label orders assigned to you through the Ghost Roaster programme."
      icon={Coffee}
    />
  );
}
