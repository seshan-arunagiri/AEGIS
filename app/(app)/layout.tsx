import { Sidebar } from "@/components/ui/sidebar";
import { Navbar } from "@/components/navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Top nav — fixed, z-50, h-14 */}
      <Navbar />
      {/* pt-14 clears the fixed navbar; sidebar is sticky top-14 */}
      <div className="flex pt-14">
        <Sidebar />
        <main className="flex-1 bg-background/50 overflow-y-auto min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
