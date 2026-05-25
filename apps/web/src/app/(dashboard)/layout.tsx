'use client';

import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen p-4 lg:p-6">
          {children}
        </main>
        <WhatsAppButton />
      </div>
    </AuthGuard>
  );
}
