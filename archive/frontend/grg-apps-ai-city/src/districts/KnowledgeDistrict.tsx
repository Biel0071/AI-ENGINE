import React, { useState, useEffect } from 'react';
import { bus, client } from '../App';

export const KnowledgeDistrict: React.FC = () => {
  const [memoryCount, setMemoryCount] = useState(0);
  const [patternCount, setPatternCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    client.fetchState('/api/knowledge').then(data => {
      if (data) {
        setMemoryCount(data.memoryCount || 0);
        setPatternCount(data.patternCount || 0);
      }
    });

    const handleMemory = (payload: any) => setMemoryCount(prev => prev + 1);
    const handlePattern = (payload: any) => setPatternCount(prev => prev + 1);

    bus.on('MemoryUpdated', handleMemory);
    bus.on('PatternPromoted', handlePattern);

    return () => {
      bus.off('MemoryUpdated', handleMemory);
      bus.off('PatternPromoted', handlePattern);
    };
  }, []);

  return (
    <div className="district-card glass-panel">
      <h2>🧠 Knowledge District</h2>
      <div className="metric-grid">
        <div className="metric-box">
          <span className="label">Experiences</span>
          <span className="value">{memoryCount}</span>
        </div>
        <div className="metric-box">
          <span className="label">Patterns</span>
          <span className="value">{patternCount}</span>
        </div>
      </div>
    </div>
  );
};
