import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { MobileTopbar } from "./mobile-topbar";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-3 lg:max-w-3xl lg:px-10 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
