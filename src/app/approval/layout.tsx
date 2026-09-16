import { ApprovalBottomNav } from "@/components/layout/ApprovalBottomNav";

export default function ApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ApprovalBottomNav />
    </div>
  );
}
