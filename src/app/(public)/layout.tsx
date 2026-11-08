import { PublicFooter, PublicHeader } from "@/components/public-chrome";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-[60vh]">{children}</main>
      <PublicFooter />
    </>
  );
}
