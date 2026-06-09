'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Menu, X } from 'lucide-react';

export default function PublicDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
