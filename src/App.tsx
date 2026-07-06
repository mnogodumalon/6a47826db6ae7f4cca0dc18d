import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import WerkzeuguebersichtPage from '@/pages/WerkzeuguebersichtPage';
import WerkzeuguebersichtDetailPage from '@/pages/WerkzeuguebersichtDetailPage';
import PublicFormWerkzeuguebersicht from '@/pages/public/PublicForm_Werkzeuguebersicht';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a478262711e1dc1b4b5e141" element={<PublicFormWerkzeuguebersicht />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="werkzeuguebersicht" element={<WerkzeuguebersichtPage />} />
                <Route path="werkzeuguebersicht/:id" element={<WerkzeuguebersichtDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
