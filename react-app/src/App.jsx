import { Navigate, Route, Routes } from 'react-router-dom';
import CharBuilder from './pages/charbuilder/CharBuilder.jsx';
import CharacterSheet from './pages/charsheet/CharacterSheet.jsx';
import GmBoardPage from './pages/gmboard/GmBoardPage.jsx';
import EncounterBuilderPage from './pages/encounterbuilder/EncounterBuilderPage.jsx';
import GmSheetsPage from './pages/gmsheets/GmSheetsPage.jsx';
import CampaignsPage from './pages/campaigns/CampaignsPage.jsx';
import CampaignSheetView from './pages/campaignsheet/CampaignSheetView.jsx';
import HomePage from './pages/home/HomePage.jsx';
import CloudAutoSync from './shared/cloud/CloudAutoSync.jsx';

export default function App() {
  return (
    <>
      <CloudAutoSync />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/charbuilder" element={<CharBuilder />} />
      <Route path="/charsheet" element={<CharacterSheet />} />
      <Route path="/gmboard" element={<GmBoardPage />} />
      <Route path="/gmsheets" element={<GmSheetsPage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaign-sheet" element={<CampaignSheetView />} />
      <Route path="/encounter-builder" element={<EncounterBuilderPage />} />
      <Route path="/builder" element={<Navigate to="/charbuilder" replace />} />
      <Route path="/sheet" element={<Navigate to="/charsheet" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
