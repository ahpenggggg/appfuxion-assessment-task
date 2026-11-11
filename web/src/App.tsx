import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router';
import { lazy, Suspense } from 'react';
import CampaignListPage from '@/features/campaign-list/CampaignListPage';
import { Skeleton } from '@/components/ui';

const CampaignDetailPage = lazy(() => import('@/features/campaign-detail/CampaignDetailPage'));
const CreateCampaignPage = lazy(() => import('@/features/campaign-create/CreateCampaignPage'));
import { cx } from '@/components/classes';

function TopBar() {
  const link = ({ isActive }: { isActive: boolean }) =>
    cx('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium', isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white');
  return (
    <header className="bg-slate-900">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 sm:gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2 text-white">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-500 text-xs font-bold">N</span>
          <span className="hidden text-sm font-semibold sm:inline">Notify Ops</span>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/campaigns" end className={link}>Campaigns</NavLink>
          <NavLink to="/campaigns/new" className={link}>New campaign</NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Suspense fallback={<Skeleton className="h-64" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/campaigns" replace />} />
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route path="/campaigns/new" element={<CreateCampaignPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
