import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import HomePage from './pages/home/HomePage.jsx';
import CloudAutoSync from './shared/cloud/CloudAutoSync.jsx';
import { pageTitleForPath } from './shared/pageTitle.js';

// Home is the landing route and ships in the entry chunk. Every other page is
// loaded on demand: the tool pages carry the bulk of the app, and nobody opens
// all of them in one sitting.
const CharBuilder = lazy(() => import('./pages/charbuilder/CharBuilder.jsx'));
const CharacterSheet = lazy(() => import('./pages/charsheet/CharacterSheet.jsx'));
const GmBoardPage = lazy(() => import('./pages/gmboard/GmBoardPage.jsx'));
const DmScreenPage = lazy(() => import('./pages/dmscreen/DmScreenPage.jsx'));
const EncounterBuilderPage = lazy(() => import('./pages/encounterbuilder/EncounterBuilderPage.jsx'));
const InstancePickerPage = lazy(() => import('./pages/library/InstancePickerPage.jsx'));
const CampaignsPage = lazy(() => import('./pages/campaigns/CampaignsPage.jsx'));
const CampaignSheetView = lazy(() => import('./pages/campaignsheet/CampaignSheetView.jsx'));
const NotFoundPage = lazy(() => import('./pages/notfound/NotFoundPage.jsx'));

export default function App() {
  return (
    <>
      <CloudAutoSync />
      <PageTitle />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/charbuilder" element={<CharBuilder />} />
          <Route path="/charsheet" element={<CharacterSheet />} />
          <Route path="/gmboard" element={<GmBoardPage />} />
          <Route path="/dm-screen" element={<DmScreenPage />} />
          <Route path="/library/:tool" element={<InstancePickerPage />} />
          <Route path="/gmsheets" element={<Navigate to="/library/characters" replace />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaign-sheet" element={<CampaignSheetView />} />
          <Route path="/encounter-builder" element={<EncounterBuilderPage />} />
          <Route path="/builder" element={<Navigate to="/charbuilder" replace />} />
          <Route path="/sheet" element={<Navigate to="/charsheet" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pageTitleForPath(pathname);
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return (
    <Box sx={fallbackSx}>
      <CircularProgress aria-label="Loading page" />
    </Box>
  );
}

const fallbackSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '60vh',
};
