import { InventoryHeader } from "./InventoryHeader";
import { InventoryTabs } from "./InventoryTabs";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <InventoryHeader />
      <InventoryTabs />
      {children}
    </div>
  );
}
