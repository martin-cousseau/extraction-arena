import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout';
import { DashboardPage } from '@/pages/dashboard-page';
import { DatasetsPage } from '@/pages/datasets-page';
import { DatasetNewPage } from '@/pages/dataset-new-page';
import { DatasetPage } from '@/pages/dataset-page';
import { RunsPage } from '@/pages/runs-page';
import { RunDetailPage } from '@/pages/run-detail-page';
import { SettingsPage } from '@/pages/settings-page';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/datasets/new" element={<DatasetNewPage />} />
          <Route path="/datasets/:id/*" element={<DatasetPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
