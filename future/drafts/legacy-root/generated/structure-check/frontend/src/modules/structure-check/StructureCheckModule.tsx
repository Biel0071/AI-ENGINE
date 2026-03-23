import { useEffect, useState } from 'react';
import { listStructureCheck } from '../../services/structure-checkApi';

export function StructureCheckModule() {
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    void listStructureCheck().then(setItems);
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold">Structure Check Module</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </section>
  );
}