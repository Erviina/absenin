import { EmployeeBottomNav } from "@/components/layout/EmployeeBottomNav";

export default function KaryawanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      {/* 
        Header is not here because some pages might have different headers (e.g. back button).
        If most pages have the same header, we could add it here.
      */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <EmployeeBottomNav />
    </div>
  );
}
