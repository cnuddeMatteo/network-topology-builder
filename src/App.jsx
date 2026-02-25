import React, { useCallback } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge 
} from 'reactflow';
import 'reactflow/dist/style.css';

// 1️⃣ Structure de données initiale (ton graphe)
const initialNodes = [
  { 
    id: '1', 
    position: { x: 250, y: 50 }, 
    data: { label: 'Routeur (R1) - 192.168.1.1' },
    type: 'default',
    style: { border: '2px solid #2563eb', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: '2', 
    position: { x: 250, y: 150 }, 
    data: { label: 'Switch (SW1)' },
    type: 'default',
    style: { border: '2px solid #16a34a', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#000' } },
];

export default function App() {
  // Gestion de l'état des nœuds et des liens
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Fonction pour lier deux équipements entre eux à la souris
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}