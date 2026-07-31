import React, { useState, useEffect } from 'react';
import { bus, client } from '../App';

export const WorkersDistrict: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    client.fetchState('/api/workers').then(data => {
      if (data && data.workers) setWorkers(data.workers);
    });

    const handleWorker = (payload: any) => {
      setWorkers(prev => {
        const idx = prev.findIndex(w => w.id === payload.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = payload;
          return next;
        }
        return [...prev, payload];
      });
    };

    bus.on('WorkerStarted', handleWorker);
    bus.on('WorkerUpdated', handleWorker);

    return () => {
      bus.off('WorkerStarted', handleWorker);
      bus.off('WorkerUpdated', handleWorker);
    };
  }, []);

  return (
    <div className="district-card glass-panel">
      <h2>🤖 Workers District</h2>
      <div className="worker-list">
        {workers.map(w => (
          <div key={w.id} className="worker-item">
            <span className="worker-name">{w.name}</span>
            <span className={`status-dot ${w.status}`}></span>
          </div>
        ))}
        {workers.length === 0 && <span className="empty-state">No active workers</span>}
      </div>
    </div>
  );
};
