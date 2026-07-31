import React, { useState, useEffect } from 'react';
import { bus, client } from '../App';

export const EvolutionDistrict: React.FC = () => {
  const [learningScore, setLearningScore] = useState(0);

  useEffect(() => {
    // Initial fetch
    client.fetchState('/api/metrics').then(data => {
      if (data && data.learningScore) setLearningScore(data.learningScore);
    });

    const handlePattern = (payload: any) => {
      // Increase score when new pattern promoted
      setLearningScore(prev => prev + 10);
    };

    bus.on('PatternPromoted', handlePattern);
    return () => bus.off('PatternPromoted', handlePattern);
  }, []);

  return (
    <div className="district-card glass-panel">
      <h2>🧬 Evolution District</h2>
      <div className="metric-grid">
        <div className="metric-box">
          <span className="label">Learning Score</span>
          <span className="value">{learningScore}</span>
        </div>
      </div>
    </div>
  );
};
