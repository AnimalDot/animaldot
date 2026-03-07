import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppLayout from './pages/AppLayout';
import BedDotTestPage from './pages/BedDotTestPage';

export type { Screen, TabScreen } from './types/navigation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/test" element={<BedDotTestPage />} />
        <Route path="/app" element={<AppLayout />} />
        <Route path="/app/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
