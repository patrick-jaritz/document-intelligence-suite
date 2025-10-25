import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import Health from './pages/Health';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/health" element={<Health />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;