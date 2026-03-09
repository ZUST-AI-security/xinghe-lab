import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import About from './pages/About';
import AlgorithmList from './pages/AlgorithmList';
import AttackLab from './pages/AttackLab';
import TestPersistence from './pages/TestPersistence';

const App = () => {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/algorithms" element={<AlgorithmList />} />
          <Route path="/about" element={<About />} />
          <Route path="/test" element={<TestPersistence />} />
          <Route path="/attack/:algoId" element={<AttackLab />} />
          
          {/* Keep compatibility with old links if any */}
          <Route path="/attack-lab" element={<AlgorithmList />} />
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default App;
