import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-sv-bg">
      <EmployeeSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
