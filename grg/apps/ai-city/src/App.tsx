import React, { useState, useEffect } from 'react';
import './index.css';
import { RuntimeClient } from './core/RuntimeClient';
import { EventBus } from './core/EventBus';
import { KnowledgeDistrict } from './districts/KnowledgeDistrict';
import { WorkersDistrict } from './districts/WorkersDistrict';
import { EvolutionDistrict } from './districts/EvolutionDistrict';
import { DeveloperDistrict } from './districts/DeveloperDistrict';

export const bus = new EventBus();
export const client = new RuntimeClient('http://209.50.241.22:4410', bus);

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [showDeveloperDistrict, setShowDeveloperDistrict] = useState(false);

  useEffect(() => {
    bus.on('RuntimeConnected', () => setStatus('Online'));
    bus.on('RuntimeDisconnected', () => setStatus('Offline'));
    client.connect();
    
    return () => client.disconnect();
  }, []);

  return (
    <div className="city-container">
      <header className="glass-header">
        <h1>FÊNIX AI City</h1>
        <div className={`status-badge ${status.toLowerCase()}`}>{status}</div>
      </header>
      <main className="districts-grid">
        <KnowledgeDistrict />
        <WorkersDistrict />
        <EvolutionDistrict />
        <div className="district-card glass-panel">⚡ Provider District (Coming Soon)</div>
        <div className="district-card glass-panel">📡 Mission Control (Coming Soon)</div>
        <div className="district-card glass-panel">📊 Observatory (Coming Soon)</div>
        <div className="district-card glass-panel">📦 Projects District (Coming Soon)</div>
        <div className="district-card glass-panel" onClick={() => setShowDeveloperDistrict(true)} style={{ cursor: 'pointer', border: '1px solid #3b82f6' }}>💻 Developer District</div>
      </main>
      {showDeveloperDistrict && (
        <DeveloperDistrict onClose={() => setShowDeveloperDistrict(false)} />
      )}
    </div>
  );
}

export default App;
