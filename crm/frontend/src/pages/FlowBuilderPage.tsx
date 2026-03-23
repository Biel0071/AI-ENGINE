import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, addEdge, Connection, Edge, Node, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { Flow } from '../types';

const blockTypes = ['message', 'image', 'audio', 'condition', 'delay'];

export default function FlowBuilderPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    void api.get<Flow[]>('/api/flows').then((items) => {
      setFlows(items);
      if (items[0]) {
        setSelectedFlowId(items[0].id);
      }
    });
  }, []);

  const currentFlow = useMemo(() => flows.find((item) => item.id === selectedFlowId) || null, [flows, selectedFlowId]);

  useEffect(() => {
    if (!currentFlow) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nextNodes: Node[] = currentFlow.nodes.map((node) => ({
      id: node.id,
      data: { label: `${node.type.toUpperCase()} - ${node.label}` },
      position: node.position,
      type: 'default',
    }));

    const nextEdges: Edge[] = currentFlow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [currentFlow, setEdges, setNodes]);

  const onConnect = useCallback((params: Connection) => setEdges((prev) => addEdge(params, prev)), [setEdges]);

  async function createFlow() {
    const created = await api.post<Flow>('/api/flows', {
      name: `Fluxo ${Date.now()}`,
      nodes: [
        {
          id: 'start',
          type: 'message',
          label: 'Inicio',
          position: { x: 60, y: 80 },
          config: {},
        },
      ],
      edges: [],
      rules: [{ type: 'first_message', value: 'true', active: true }],
    });

    setFlows([created, ...flows]);
    setSelectedFlowId(created.id);
  }

  async function saveFlow() {
    if (!selectedFlowId) {
      return;
    }

    await api.put(`/api/flows/${selectedFlowId}`, {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: String((node.data as { label?: string })?.label || 'message').toLowerCase(),
        label: String((node.data as { label?: string })?.label || node.id),
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })),
      rules: currentFlow?.rules || [],
    });

    const refreshed = await api.get<Flow[]>('/api/flows');
    setFlows(refreshed);
  }

  function addNode(type: string) {
    const id = `${type}-${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        data: { label: type },
        position: { x: 180 + prev.length * 30, y: 100 + prev.length * 30 },
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Builder de Fluxo</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={createFlow}>Novo fluxo</Button>
          <Button onClick={saveFlow}>Salvar</Button>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {flows.map((flow) => (
            <button
              key={flow.id}
              onClick={() => setSelectedFlowId(flow.id)}
              className={`rounded-lg border px-3 py-1 text-xs ${selectedFlowId === flow.id ? 'border-accent bg-accent/20 text-white' : 'border-borderSoft text-slate-300'}`}
            >
              {flow.name}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {blockTypes.map((type) => (
            <Button key={type} variant="secondary" onClick={() => addNode(type)}>
              Bloco {type}
            </Button>
          ))}
        </div>

        <div className="h-[560px] overflow-hidden rounded-lg border border-borderSoft">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </Card>
    </div>
  );
}
