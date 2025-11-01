import { Routes, Route } from 'react-router-dom';
import App from './App';
import LearnMore from './pages/LearnMore';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/learn-more" element={<LearnMore />} />
    </Routes>
  );
}

export default AppRouter;
