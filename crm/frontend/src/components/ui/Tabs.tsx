interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-borderSoft bg-panelSoft p-1">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${item.key === activeKey ? 'bg-accent text-white' : 'text-slate-300'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
