import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

// Same shell as the other admin pages, but the sidebar/topbar are hidden
// when printing so only the cards come out on paper.
export default function QrCardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-sv-bg print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
