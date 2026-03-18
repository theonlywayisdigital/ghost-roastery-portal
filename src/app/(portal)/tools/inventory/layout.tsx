import { InventoryTabs } from "./InventoryTabs";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="text-slate-500 mt-1">
          Manage your green bean and roasted coffee stock.
        </p>
      </div>
      <InventoryTabs />
      {children}
    </div>
  );
}
