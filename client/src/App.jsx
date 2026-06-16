import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MapPage from './pages/MapPage';
import StatePage from './pages/StatePage';
import TrendsPage from './pages/TrendsPage';
import ComparePage from './pages/ComparePage';
import AnalysisPage from './pages/AnalysisPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/state/:name" element={<StatePage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </Layout>
  );
}
