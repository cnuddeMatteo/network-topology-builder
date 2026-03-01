import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, ReactFlowProvider, Handle, Position, NodeResizer, BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { toPng } from 'html-to-image';
import { Cloud, Shield, Router, Network, Monitor, Server, Lock, Unlock, Scissors, Trash2, Play, Maximize, AlertTriangle, MonitorOff, Eye, EyeOff, ArrowLeft, Zap, X, CheckCircle, Terminal, Copy, Check, ChevronLeft, ChevronRight, Undo2, HelpCircle } from 'lucide-react';
import 'reactflow/dist/style.css';
import Sidebar from './Sidebar';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { this.setState({ info }); console.error("Crash ReactFlow intercepté :", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', color: '#fca5a5', backgroundColor: '#111827', height: '100vh', fontFamily: 'monospace', overflow: 'auto', boxSizing: 'border-box' }}>
          <h2 style={{ color: '#ef4444' }}>💥 Oups ! Une erreur a fait planter l'interface.</h2>
          <p style={{ fontSize: '16px', color: 'white' }}>Message : {this.state.error?.toString()}</p>
          <pre style={{ padding: '15px', backgroundColor: '#1f2937', borderRadius: '8px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const FlowContext = createContext({});

const getIconForLabel = (label, color = 'white', size = 20) => {
  const l = (label || '').toLowerCase();
  if (l.includes('cloud')) return <Cloud size={size} color={color} />;
  if (l.includes('firewall')) return <Shield size={size} color={color} />;
  if (l.includes('routeur')) return <Router size={size} color={color} />;
  if (l.includes('switch')) return <Network size={size} color={color} />;
  if (l.includes('serveur')) return <Server size={size} color={color} />;
  return <Monitor size={size} color={color} />;
};

const ipToInt = (ip) => {
    if (!ip || typeof ip !== 'string') return 0;
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
const isIpInSubnet = (ip, subnetIp, cidr) => {
    if (!ip || !subnetIp || !cidr || ip.toUpperCase() === 'DHCP') return true; 
    const mask = -1 << (32 - parseInt(cidr, 10));
    return (ipToInt(ip) & mask) === (ipToInt(subnetIp) & mask);
};

const SafeResizer = typeof NodeResizer !== 'undefined' ? NodeResizer : () => null;

// --- 📝 NOUVEAU COMPOSANT : POST-IT (NOTE) ---
const NoteNode = ({ id, data, selected }) => {
    const { triggerDelete } = useContext(FlowContext) || {};
    const [hover, setHover] = useState(false);
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ minWidth: 150, minHeight: 100, backgroundColor: data.color || '#fef08a', color: '#1e293b', padding: '15px', borderRadius: '4px', boxShadow: '2px 4px 10px rgba(0,0,0,0.3)', fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive, sans-serif', fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', position: 'relative', border: selected ? '2px solid #3b82f6' : 'none' }}>
        {data.label}
        {hover && (
           <div onClick={(e) => { e.stopPropagation(); triggerDelete?.(id); }} style={{ position: 'absolute', top: -10, right: -10, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', border: `1px solid #7f1d1d`, zIndex: 100 }}><Trash2 size={12}/></div>
        )}
      </div>
    );
};

// --- CÂBLES ---
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }) => {
  const ctx = useContext(FlowContext) || {};
  const showIPs = ctx.showIPs !== false; 
  const pingPathEdges = ctx.pingPathEdges || [];

  if (sourceX === undefined || targetX === undefined) return null;

  try {
      const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition: sourcePosition || Position.Bottom, targetX, targetY, targetPosition: targetPosition || Position.Top });
      
      // 📊 BANDE PASSANTE (ÉPAISSEUR)
      let bwWidth = 2;
      if (data?.bandwidth === '10G') bwWidth = 5;
      else if (data?.bandwidth === '100M') bwWidth = 1;

      let edgeStyle = { ...style, strokeWidth: bwWidth, transition: 'all 0.3s ease' };
      let edgeColor = data?.vlanColor || '#9ca3af'; 

      const isPinging = pingPathEdges.includes(id);

      if (isPinging) { edgeStyle = { ...edgeStyle, stroke: '#10b981', strokeWidth: 6, filter: 'drop-shadow(0 0 8px #10b981)' }; edgeColor = '#10b981'; } 
      else if (data?.type === 'fiber') { edgeStyle = { ...edgeStyle, stroke: '#60a5fa', strokeDasharray: '5,5' }; edgeColor = '#60a5fa'; } 
      else if (data?.type === 'console') { edgeStyle = { ...edgeStyle, stroke: '#ef4444', strokeDasharray: '2,3' }; edgeColor = '#ef4444'; } 
      else { edgeStyle = { ...edgeStyle, stroke: edgeColor }; }

      return (
        <>
          <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} className={isPinging ? "animated-ping-edge react-flow__edge-path" : "react-flow__edge-path"} />
          <EdgeLabelRenderer>
            {showIPs && data?.vlan && ( <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', background: edgeColor, color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 100 }} className="nodrag nopan">VLAN {data.vlan}</div> )}
            {showIPs && data?.srcPort && ( <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX) * 0.4}px,${sourceY + (labelY - sourceY) * 0.4}px)`, pointerEvents: 'none', background: '#1f2937', color: '#9ca3af', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', border: '1px solid #374151', zIndex: 50 }}>{data.srcPort}</div> )}
            {showIPs && data?.dstPort && ( <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${targetX - (targetX - labelX) * 0.4}px,${targetY - (targetY - labelY) * 0.4}px)`, pointerEvents: 'none', background: '#1f2937', color: '#9ca3af', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', border: '1px solid #374151', zIndex: 50 }}>{data.dstPort}</div> )}
          </EdgeLabelRenderer>
        </>
      );
  } catch (error) { return null; }
};

const CustomNode = ({ id, data }) => {
  const ctx = useContext(FlowContext) || {};
  const { showIPs, nodeWarnings, pingSource, pingTarget, pingMode } = ctx;
  const lines = typeof data?.label === 'string' ? data.label.split('\n') : [];
  const title = lines[0] || 'Appareil';
  const details = lines.slice(1).join('\n');
  const warning = nodeWarnings?.[id];

  const isPingSource = pingSource === id; const isPingTarget = pingTarget === id;
  const isPingSelectable = pingMode && !isPingSource && !isPingTarget && (title.includes('PC') || title.includes('Serveur'));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: (isPingSource || isPingTarget) ? 'scale(1.1)' : 'scale(1)', cursor: isPingSelectable ? 'crosshair' : 'default' }}>
      {isPingSource && <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '12px', border: '3px dashed #3b82f6', animation: 'spin 4s linear infinite', zIndex: -1 }} />}
      {isPingTarget && <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '12px', border: '3px dashed #10b981', zIndex: -1 }} />}
      <Handle type="target" position={Position.Top} style={{ background: '#9ca3af', width: 6, height: 6, border: 'none' }} />
      {warning && ( <div title={warning} style={{ position: 'absolute', top: -8, right: -8, zIndex: 100, color: '#ef4444', background: '#fee2e2', borderRadius: '50%', padding: '4px', display: 'flex', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)', cursor: 'help' }}><AlertTriangle size={14} /></div> )}
      <div style={{ pointerEvents: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        {getIconForLabel(title, data?.color || '#f9fafb', 24)}
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#f9fafb' }}>{title}</div>
        {showIPs && details && <div style={{ fontSize: '10px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{details}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#9ca3af', width: 6, height: 6, border: 'none' }} />
    </div>
  );
};

const CustomGroupNode = ({ id, data, selected }) => {
  const { toggleLock, unlinkGroup, triggerDelete } = useContext(FlowContext) || {};
  const [hover, setHover] = useState(false);
  const btnStyle = { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#374151', color: 'white', border: `1px solid ${data?.color || '#333'}` };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', height: '100%' }}>
      <SafeResizer minWidth={250} minHeight={150} isVisible={selected && !data?.locked} lineStyle={{ borderColor: data?.color }} handleStyle={{ background: data?.color, width: 8, height: 8, borderRadius: 4 }} />
      <div style={{ width: '100%', height: '100%', border: `2px dashed ${data?.color || '#333'}`, backgroundColor: `${data?.color || '#333'}1A`, borderRadius: '12px', position: 'relative' }}>
         {data?.label && <div style={{ position: 'absolute', top: -14, left: 30, background: '#111827', padding: '2px 15px', color: data?.color, fontWeight: 'bold', borderRadius: '6px', border: `1px solid ${data?.color}`, fontSize: '12px' }}>{data.label}</div>}
         {hover && (
           <div style={{ position: 'absolute', top: -14, right: 10, display: 'flex', gap: '6px', zIndex: 100 }}>
             <div onClick={(e) => { e.stopPropagation(); unlinkGroup?.(id); }} title="Détacher le fond" style={btnStyle}><Scissors size={12}/></div>
             <div onClick={(e) => { e.stopPropagation(); toggleLock?.(id); }} title="Verrouiller" style={btnStyle}>{data?.locked ? <Lock size={12}/> : <Unlock size={12}/>}</div>
             <div onClick={(e) => { e.stopPropagation(); triggerDelete?.(id); }} title="Supprimer" style={{...btnStyle, backgroundColor: '#ef4444', borderColor: '#ef4444'}}><Trash2 size={12}/></div>
           </div>
         )}
      </div>
    </div>
  );
};

const InfraBoxNode = ({ id, data, selected }) => {
  const { toggleLock, unlinkGroup, triggerDelete } = useContext(FlowContext) || {};
  const [hover, setHover] = useState(false);
  const boxColor = data?.color || '#6b7280';
  const btnStyle = { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#374151', color: 'white', border: `1px solid ${boxColor}` };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', height: '100%' }}>
      <SafeResizer minWidth={400} minHeight={300} isVisible={selected && !data?.locked} lineStyle={{ borderColor: boxColor }} handleStyle={{ background: boxColor, width: 8, height: 8, borderRadius: 4 }} />
      <div style={{ width: '100%', height: '100%', border: `3px dashed ${boxColor}`, backgroundColor: 'rgba(75, 85, 99, 0.05)', borderRadius: '16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -14, left: 30, background: '#111827', padding: '2px 15px', color: '#d1d5db', fontWeight: 'bold', borderRadius: '6px', border: `1px solid ${boxColor}`, fontSize: '13px' }}>{data?.label}</div>
        {hover && (
           <div style={{ position: 'absolute', top: -14, right: 10, display: 'flex', gap: '6px', zIndex: 100 }}>
             <div onClick={(e) => { e.stopPropagation(); unlinkGroup?.(id); }} title="Détacher le fond" style={btnStyle}><Scissors size={12}/></div>
             <div onClick={(e) => { e.stopPropagation(); toggleLock?.(id); }} title="Verrouiller" style={btnStyle}>{data?.locked ? <Lock size={12}/> : <Unlock size={12}/>}</div>
             <div onClick={(e) => { e.stopPropagation(); triggerDelete?.(id); }} title="Supprimer" style={{...btnStyle, backgroundColor: '#ef4444', borderColor: '#ef4444'}}><Trash2 size={12}/></div>
           </div>
         )}
      </div>
    </div>
  );
};

const nodeTypes = { custom: CustomNode, customGroup: CustomGroupNode, infraBox: InfraBoxNode, note: NoteNode };
const edgeTypes = { custom: CustomEdge };
const initialNodes = [];
const generateId = () => `id-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

const pingStyles = `
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .animated-ping-edge { stroke-dasharray: 10; animation: dashdraw 0.5s linear infinite; }
  @keyframes dashdraw { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
`;

function DnDFlow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [currentView, setCurrentView] = useState('main'); 
  const [showPCs, setShowPCs] = useState(true);
  const [showIPs, setShowIPs] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [contextMenu, setContextMenu] = useState(null);

  const [rightPanel, setRightPanel] = useState({ isOpen: false, type: 'none' }); 
  const [editData, setEditData] = useState({ id: null, name: '', ip: '', mask: '', themeColor: '#3b82f6', isInfra: false });
  const [editEdgeData, setEditEdgeData] = useState({ id: null, type: 'copper', bandwidth: '1G', srcPort: '', dstPort: '', vlan: '', vlanColor: '#9ca3af' });
  const [quickAddData, setQuickAddData] = useState({ type: 'PC', name: 'Nouveau PC', ip: 'DHCP', vlan: '10' });
  
  const [cliScript, setCliScript] = useState("");
  const [cliCopied, setCliCopied] = useState(false);

  const [pingMode, setPingMode] = useState(false);
  const [pingSource, setPingSource] = useState(null);
  const [pingTarget, setPingTarget] = useState(null);
  const [pingPathEdges, setPingPathEdges] = useState([]);
  const [pingMessage, setPingMessage] = useState(null);

  const [nodeWarnings, setNodeWarnings] = useState({});

  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const takeSnapshot = useCallback((newNodes, newEdges) => {
      const h = historyRef.current.slice(0, historyIndexRef.current + 1);
      h.push({ nodes: newNodes, edges: newEdges });
      if (h.length > 50) h.shift(); 
      historyRef.current = h;
      historyIndexRef.current = h.length - 1;
  }, []);

  const undo = useCallback(() => {
      if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          const prevState = historyRef.current[historyIndexRef.current];
          setNodes(prevState.nodes);
          setEdges(prevState.edges);
      }
  }, [setNodes, setEdges]);

  useEffect(() => {
      const handleKeyDown = (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return; 
              e.preventDefault();
              undo();
          }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  useEffect(() => {
      if (historyRef.current.length === 0) takeSnapshot(nodes, edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyCLI = () => {
    navigator.clipboard.writeText(cliScript);
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2000);
  };

  const getDeviceConfig = (node, allNodes, allEdges) => {
    const nodeLabel = node.data.label.split('\n')[0].replace(/[^a-zA-Z0-9-]/g, '_');
    let script = `!\n! === CONFIGURATION POUR ${nodeLabel} ===\n!\nenable\nconfigure terminal\nhostname ${nodeLabel}\n!\n`;
    
    const connectedEdges = allEdges.filter(e => e.source === node.id || e.target === node.id);
    let vlansCreated = new Set();
    
    connectedEdges.forEach(e => {
        const isSource = e.source === node.id;
        const port = isSource ? e.data?.srcPort : e.data?.dstPort;
        const otherNodeId = isSource ? e.target : e.source;
        const otherNode = allNodes.find(n => n.id === otherNodeId);
        const otherType = (otherNode?.data?.label || '').toLowerCase();
        
        if (e.data?.vlan && !vlansCreated.has(e.data.vlan)) {
            script += `vlan ${e.data.vlan}\n name VLAN_${e.data.vlan}\n!\n`;
            vlansCreated.add(e.data.vlan);
        }

        if (port) {
            script += `interface ${port}\n`;
            if (otherType.includes('pc') || otherType.includes('serveur')) {
                script += ` switchport mode access\n`;
                if (e.data?.vlan) script += ` switchport access vlan ${e.data.vlan}\n`;
                script += ` spanning-tree portfast\n`;
            } else if (otherType.includes('switch') || otherType.includes('routeur')) {
                script += ` switchport mode trunk\n`;
                if (e.data?.vlan) script += ` switchport trunk allowed vlan ${e.data.vlan}\n`;
            }
            script += ` no shutdown\n!\n`;
        }
    });
    script += `end\nwrite memory\n\n`;
    return script;
  }

  const generateCLI = () => {
    const targetNode = nodes.find(n => n.id === editData?.id);
    if (!targetNode || !targetNode.data?.label) return;
    setCliScript(getDeviceConfig(targetNode, nodes, edges));
  };

  // 📜 EXPORT GLOBAL DE TOUS LES SWITCHS/ROUTEURS
  const exportAllCLI = useCallback(() => {
    const routersAndSwitches = nodes.filter(n => n.type === 'custom' && (n.data?.label?.toLowerCase().includes('switch') || n.data?.label?.toLowerCase().includes('routeur')));
    if(routersAndSwitches.length === 0) { alert("Aucun Switch ou Routeur trouvé dans le réseau."); return; }

    let fullScript = "";
    routersAndSwitches.forEach(device => {
        fullScript += getDeviceConfig(device, nodes, edges);
    });

    const blob = new Blob([fullScript], { type: "text/plain;charset=utf-8" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Global_Network_Config.txt";
    a.click();
  }, [nodes, edges]);

  const verifyNetwork = () => {
    const warnings = {}; const ipMap = {};
    nodes.forEach(n => {
        if (n.type !== 'custom') return;
        const isFinalDevice = n.data?.label?.includes('PC') || n.data?.label?.includes('Serveur');
        const lines = typeof n.data?.label === 'string' ? n.data.label.split('\n') : [];
        const ipLine = lines.find(l => l.includes('IP:'));
        let pcIp = null;

        if (ipLine) {
            pcIp = ipLine.replace('IP:', '').replace('(DHCP)', '').trim();
            if (pcIp && pcIp.toUpperCase() !== 'DHCP') {
                if (ipMap[pcIp]) { warnings[n.id] = `Conflit IP !`; warnings[ipMap[pcIp]] = `Conflit IP !`; } 
                else { ipMap[pcIp] = n.id; }
            }
        } else if (isFinalDevice) { warnings[n.id] = "Aucune IP configurée."; }

        if (pcIp && isFinalDevice && n.data?.network) {
            const switchNode = nodes.find(sw => sw.id === n.data.network);
            if (switchNode) {
                const switchLines = typeof switchNode.data?.label === 'string' ? switchNode.data.label.split('\n') : [];
                const switchIpLine = switchLines.find(l => typeof l === 'string' && l.match(/\d+\.\d+\.\d+\.\d+\/\d+/));
                if (switchIpLine) {
                    const ipMatch = switchIpLine.match(/(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
                    if (ipMatch && !isIpInSubnet(pcIp, ipMatch[1], ipMatch[2])) {
                        warnings[n.id] = `Erreur : L'IP n'est pas dans le sous-réseau (${ipMatch[1]}/${ipMatch[2]}).`;
                    }
                }
            }
        }
    });

    setNodeWarnings(warnings);
    if (Object.keys(warnings).length === 0 && nodes.length > 0) alert("✅ Tout est parfait ! Aucun conflit IP ni erreur de routage détecté.");
    else if (Object.keys(warnings).length > 0) alert("⚠️ Des erreurs ont été détectées. Vérifie les icônes rouges sur le schéma.");
  };

  const getPath = useCallback((srcId, tgtId) => {
    const queue = [[srcId]]; const visited = new Set([srcId]);
    while (queue.length > 0) {
        const path = queue.shift(); const node = path[path.length - 1];
        if (node === tgtId) return path;
        const neighbors = edges.filter(e => e.source === node || e.target === node).map(e => e.source === node ? e.target : e.source);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) { visited.add(neighbor); queue.push([...path, neighbor]); }
        }
    }
    return null;
  }, [edges]);

  const resetPing = () => { setPingSource(null); setPingTarget(null); setPingPathEdges([]); setPingMessage(null); };

  const executePing = useCallback((src, tgt) => {
    const pathNodes = getPath(src, tgt);
    if (pathNodes) {
        const pEdges = [];
        for (let i = 0; i < pathNodes.length - 1; i++) {
             const e = edges.find(ed => (ed.source === pathNodes[i] && ed.target === pathNodes[i+1]) || (ed.target === pathNodes[i] && ed.source === pathNodes[i+1]));
             if(e) pEdges.push(e.id);
        }
        setPingPathEdges(pEdges); setPingMessage({ text: 'Ping Réussi ! ✅', type: 'success' });
    } else {
        setPingMessage({ text: 'Échec : Aucune route physique trouvée. ❌', type: 'error' });
    }
    setTimeout(resetPing, 4000); 
  }, [edges, getPath]);

  const getCascadingIds = useCallback((id, currentNodes) => {
    let ids = [id]; const target = currentNodes.find(n => n.id === id);
    if(target) {
      if (target.id.startsWith('SW-') && target.parentNode) {
        ids.push(target.parentNode); ids.push(...currentNodes.filter(n => n.parentNode === target.parentNode).map(n => n.id));
      } else if (target.type === 'customGroup' || target.type === 'infraBox') {
        ids.push(...currentNodes.filter(n => n.parentNode === target.id).map(n => n.id));
      }
    }
    return ids;
  }, []);

  const triggerDelete = useCallback((id) => {
    let newNodes = []; let newEdges = [];
    setNodes((nds) => {
      const idsToDelete = getCascadingIds(id, nds);
      newNodes = nds.filter((n) => !idsToDelete.includes(n.id));
      return newNodes;
    });
    setEdges((eds) => {
      const idsToDelete = getCascadingIds(id, nodes);
      newEdges = eds.filter((e) => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target) && e.id !== id);
      return newEdges;
    });
    setContextMenu(null); setRightPanel({ isOpen: false, type: 'none' });
    takeSnapshot(newNodes, newEdges);
  }, [setNodes, setEdges, getCascadingIds, nodes, takeSnapshot]);

  const toggleLock = useCallback((id) => {
    let newNodes = nodes.map(n => n.id === id ? { ...n, draggable: n.data?.locked, data: { ...n.data, locked: !n.data?.locked } } : n);
    setNodes(newNodes);
    setContextMenu(null);
    takeSnapshot(newNodes, edges);
  }, [nodes, edges, setNodes, takeSnapshot]);

  const unlinkGroup = useCallback((id) => {
    let newNodes = [];
    setNodes((nds) => {
      const groupNode = nds.find(n => n.id === id);
      if (!groupNode) return nds;
      newNodes = nds.map(n => {
        if (n.parentNode === id) {
          const absX = groupNode.position.x + n.position.x; const absY = groupNode.position.y + n.position.y;
          const { parentNode, ...restNode } = n; 
          return { ...restNode, position: { x: absX, y: absY } };
        }
        return n;
      });
      return newNodes;
    });
    setContextMenu(null);
    takeSnapshot(newNodes, edges);
  }, [edges, setNodes, takeSnapshot]);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault(); if(pingMode) return;
    setContextMenu({ id: node.id, top: event.clientY, left: event.clientX, node: node, isEdge: false });
  }, [pingMode]);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault(); if(pingMode) return;
    setContextMenu({ id: edge.id, top: event.clientY, left: event.clientX, edge: edge, isEdge: true });
  }, [pingMode]);

  const onEdgeDoubleClick = useCallback((event, edge) => {
    if(pingMode) return; setContextMenu(null);
    setEditEdgeData({ id: edge.id, type: edge.data?.type || 'copper', bandwidth: edge.data?.bandwidth || '1G', srcPort: edge.data?.srcPort || '', dstPort: edge.data?.dstPort || '', vlan: edge.data?.vlan || '', vlanColor: edge.data?.vlanColor || '#9ca3af' });
    setRightPanel({ isOpen: true, type: 'edge' });
  }, [pingMode]);

  const onNodeDoubleClick = useCallback((event, node) => {
    if(pingMode) return; setContextMenu(null); setCliScript(""); 
    let targetNode = node;
    if (node.type === 'customGroup') {
      const switchNode = nodes.find(n => n.parentNode === node.id && n.id.startsWith('SW-'));
      if (switchNode) targetNode = switchNode; else return; 
    }
    if (targetNode.type === 'infraBox') {
       setEditData({ id: targetNode.id, name: targetNode.data?.label || '', ip: '', mask: '', themeColor: targetNode.data?.color || '#6b7280', isInfra: true });
       setRightPanel({ isOpen: true, type: 'node' }); return;
    }
    if (targetNode.type === 'note') {
        setEditData({ id: targetNode.id, name: targetNode.data?.label || '', themeColor: targetNode.data?.color || '#fef08a' });
        setRightPanel({ isOpen: true, type: 'note' }); return;
    }
    
    if (!targetNode.data?.label) return; 
    const lines = typeof targetNode.data.label === 'string' ? targetNode.data.label.split('\n') : [];
    let name = lines[0] || ''; let ip = '', mask = '';
    if (lines[1]) {
        const ipStr = lines[1].replace('IP:', '').trim();
        if (ipStr.includes('(DHCP)')) ip = 'DHCP';
        else { const ipParts = ipStr.split('/'); ip = ipParts[0].trim(); mask = ipParts[1] ? ipParts[1].trim() : ''; }
    }
    
    if (targetNode.id.startsWith('SW-')) {
        const connectedEdge = edges.find(e => e.source === targetNode.id && e.data?.vlan);
        const guessedVlan = connectedEdge ? connectedEdge.data.vlan : '10';
        setQuickAddData({ type: 'PC', name: 'Nouveau PC', ip: 'DHCP', vlan: guessedVlan });
    }

    setEditData({ id: targetNode.id, name, ip, mask, themeColor: targetNode.data?.color || '#3b82f6', isInfra: false });
    setRightPanel({ isOpen: true, type: 'node' });
  }, [nodes, edges, pingMode]);

  const handleQuickAdd = () => {
    const switchNode = nodes.find(n => n.id === editData.id);
    if (!switchNode) return;

    const isPC = quickAddData.type === 'PC';
    const newId = `${isPC ? 'PC' : 'SRV'}-${generateId()}`;
    const randomXOffset = Math.floor(Math.random() * 120) - 60; 
    const newPos = { x: switchNode.position.x + randomXOffset, y: switchNode.position.y + 130 };

    let label = `${quickAddData.name}\nIP: `;
    if (quickAddData.ip.toUpperCase() === 'DHCP') {
        const baseIp = isPC ? '192.168.1.' : '10.0.0.';
        label += `${baseIp}${Math.floor(Math.random() * 240) + 10} (DHCP)`;
    } else {
        label += quickAddData.ip;
    }

    const newNode = {
        id: newId, type: 'custom', parentNode: switchNode.parentNode, position: newPos,
        data: { label, network: switchNode.id, color: switchNode.data?.color || '#9ca3af' },
        style: { background: isPC ? '#1f2937' : '#7c2d12', color: '#f9fafb', border: `1px solid ${switchNode.data?.color || '#9ca3af'}`, borderRadius: '8px', padding: '10px', width: isPC ? 120 : 140, textAlign: 'center' }
    };

    const newEdge = {
        id: `e-${switchNode.id}-${newId}`, source: switchNode.id, target: newId, type: 'custom', animated: true,
        data: { network: switchNode.id, type: isPC ? 'copper' : 'fiber', bandwidth: '1G', vlan: quickAddData.vlan, vlanColor: switchNode.data?.color || '#9ca3af', srcPort: `fa0/${Math.floor(Math.random() * 24) + 1}`, dstPort: 'eth0' }
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges = [...edges, newEdge];
    setNodes(updatedNodes); setEdges(updatedEdges);
    takeSnapshot(updatedNodes, updatedEdges);
  };

  const handleNodeChange = (field, value) => {
      const newEditData = { ...editData, [field]: value };
      setEditData(newEditData);

      setNodes((nds) => nds.map(n => {
        if (n.type === 'note' && n.id === newEditData.id) {
             n.data.label = newEditData.name; n.data.color = newEditData.themeColor; return n;
        }
        if (newEditData.isInfra && n.id === newEditData.id) { n.data.label = newEditData.name; n.data.color = newEditData.themeColor; return n; }
        if (n.id === newEditData.id) {
          let newLabel = newEditData.name || '';
          if (newEditData.ip && !newEditData.isInfra) {
              if (newEditData.ip.toUpperCase() === 'DHCP') {
                  const fakeIp = newLabel.includes('Serveur') ? `10.0.0.${Math.floor(Math.random() * 240)+10}` : `192.168.1.${Math.floor(Math.random() * 240)+10}`;
                  newLabel += `\nIP: ${fakeIp} (DHCP)`;
              } else { newLabel += `\nIP: ${newEditData.ip}`; if (newEditData.mask) newLabel += `/${newEditData.mask}`; }
          }
          n.data.label = newLabel;
        }

        const isGroupOrSwitch = newEditData.id?.startsWith('SW-') || newEditData.id?.startsWith('Group-');
        const targetNode = nds.find(node => node.id === newEditData.id);

        if (isGroupOrSwitch && !newEditData.isInfra) {
            const groupId = newEditData.id?.startsWith('SW-') ? targetNode?.parentNode : newEditData.id;
            if (groupId && (n.id === groupId || n.parentNode === groupId)) {
                n.data.color = newEditData.themeColor;
                if (n.type === 'customGroup') {
                    const lines = (newEditData.name || '').split('\n'); n.data.label = lines[1] || lines[0] || 'Réseau';
                    n.style = { ...n.style, border: `2px dashed ${newEditData.themeColor}`, backgroundColor: `${newEditData.themeColor}1A` };
                } else {
                    n.style = { ...n.style, border: `2px solid ${newEditData.themeColor}` };
                    if (n.id.startsWith('SW-')) n.style.boxShadow = `0 0 10px ${newEditData.themeColor}66`;
                }
            }
        } else if (!isGroupOrSwitch && !newEditData.isInfra && n.id === newEditData.id) {
            n.data.color = newEditData.themeColor;
            const isHeavy = n.id.startsWith('R-') || n.id.startsWith('fw-') || n.id.startsWith('cloud-');
            n.style = { ...n.style, border: `${isHeavy ? '2px' : '1px'} solid ${newEditData.themeColor}` };
            if (n.id.startsWith('R-')) n.style.boxShadow = `0 0 10px ${newEditData.themeColor}66`;
        }
        return n;
      }));
  };

  const saveNodeData = () => { setRightPanel({ isOpen: false, type: 'none' }); takeSnapshot(nodes, edges); }

  const handleEdgeChange = (field, value) => {
      const newEdgeData = { ...editEdgeData, [field]: value };
      setEditEdgeData(newEdgeData);
      setEdges((eds) => eds.map(e => e.id === newEdgeData.id ? { ...e, data: { ...e.data, ...newEdgeData } } : e));
  };
  
  const saveEdgeData = () => { setRightPanel({ isOpen: false, type: 'none' }); takeSnapshot(nodes, edges); }

  const onConnectLogic = useCallback((params) => {
    const srcNode = nodes.find(n => n.id === params.source);
    const tgtNode = nodes.find(n => n.id === params.target);
    if(!srcNode || !tgtNode) return;

    const getDeviceType = (label) => {
        const l = (label || '').toLowerCase();
        if (l.includes('pc')) return 'pc';
        if (l.includes('serveur')) return 'server';
        if (l.includes('switch')) return 'switch';
        if (l.includes('routeur')) return 'router';
        if (l.includes('firewall')) return 'firewall';
        if (l.includes('cloud')) return 'cloud';
        return 'unknown';
    };

    const srcType = getDeviceType(srcNode.data?.label); const tgtType = getDeviceType(tgtNode.data?.label);

    const validPairs = [
        ['pc', 'switch'], ['pc', 'router'], ['pc', 'firewall'],
        ['server', 'switch'], ['server', 'router'], ['server', 'firewall'],
        ['switch', 'switch'], ['switch', 'router'], ['switch', 'firewall'],
        ['router', 'router'], ['router', 'firewall'], ['router', 'cloud'],
        ['firewall', 'cloud']
    ];

    const isValid = validPairs.some(pair => (pair[0] === srcType && pair[1] === tgtType) || (pair[1] === srcType && pair[0] === tgtType));

    if (!isValid) { alert(`❌ Branchement invalide : Impossible de relier un(e) ${srcType.toUpperCase()} à un(e) ${tgtType.toUpperCase()}.`); return; }

    setEdges((eds) => {
        const newEdges = addEdge({ ...params, type: 'custom', animated: true, data: { network: currentView === 'main' ? null : currentView, type: 'copper', bandwidth: '1G', srcPort: '', dstPort: '', vlan: '', vlanColor: '#9ca3af' } }, eds);
        takeSnapshot(nodes, newEdges);
        return newEdges;
    });
  }, [setEdges, currentView, nodes, takeSnapshot]);

  const onNodeDragStop = useCallback((event, node, nnds) => { takeSnapshot(nodes, edges); }, [nodes, edges, takeSnapshot]);

  const onNodeClick = useCallback((event, node) => {
    setContextMenu(null);
    if (pingMode) {
        if (!pingSource && (node.data?.label?.includes('PC') || node.data?.label?.includes('Serveur'))) { setPingSource(node.id); } 
        else if (pingSource && !pingTarget && node.id !== pingSource && (node.data?.label?.includes('PC') || node.data?.label?.includes('Serveur'))) {
            setPingTarget(node.id); executePing(pingSource, node.id);
        }
        return;
    }
  }, [pingMode, pingSource, pingTarget, executePing]);

  const onPaneClick = useCallback(() => {
    setContextMenu(null); setRightPanel({ isOpen: false, type: 'none' });
    if (!pingMode) setCurrentView('main');
  }, [pingMode]);

  useEffect(() => {
    setNodes(nds => {
        let hasChanges = false;
        const currentEdges = reactFlowInstance ? reactFlowInstance.getEdges() : edges;

        const newNodes = nds.map(n => {
            let isVisible = true;
            if (currentView === 'main') {
                const isPC = typeof n.data?.label === 'string' && (n.data.label.includes('PC') || n.data.label.includes('Serveur'));
                isVisible = isPC ? showPCs : true;
            } else {
                const switchEdges = currentEdges.filter(e => e.source === currentView || e.target === currentView);
                const switchVlans = new Set(switchEdges.map(e => e.data?.vlan).filter(Boolean));
                const isDirectFamily = n.id === currentView || n.data?.network === currentView || n.id === nds.find(node => node.id === currentView)?.parentNode;
                const isRouter = n.id.startsWith('R-') || n.type === 'infraBox' || n.type === 'note';
                const sharesVlan = currentEdges.some(e => (e.source === n.id || e.target === n.id) && switchVlans.has(e.data?.vlan));
                isVisible = isDirectFamily || isRouter || sharesVlan;
            }
            if (n.hidden !== !isVisible) hasChanges = true;
            return { ...n, hidden: !isVisible, style: { ...n.style, opacity: isVisible ? 1 : 0.2, filter: isVisible ? 'none' : 'grayscale(100%)' } };
        });
        return hasChanges ? newNodes : nds; 
    });

    setEdges(eds => {
        let hasChanges = false;
        const newEdges = eds.map(e => {
            let isVisible = true;
            if (currentView !== 'main') {
                const switchEdges = eds.filter(ed => ed.source === currentView || ed.target === currentView);
                const switchVlans = new Set(switchEdges.map(ed => ed.data?.vlan).filter(Boolean));
                isVisible = e.source === currentView || e.target === currentView || switchVlans.has(e.data?.vlan);
            }
            if (e.hidden !== !isVisible) hasChanges = true;
            return { ...e, hidden: !isVisible };
        });
        return hasChanges ? newEdges : eds;
    });

    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2, duration: 500 }), 50);
  }, [currentView, showPCs, reactFlowInstance]); 

  const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);
  
  const onDrop = useCallback((event) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      if (!type) return;

      let id = generateId();
      if (type === 'infraBox') id = `INFRA-${generateId()}`;
      else if (type === 'note') id = `NOTE-${generateId()}`;
      else if (label && label.toLowerCase().includes('switch')) id = `SW-${generateId()}`;
      else if (label && label.toLowerCase().includes('pc')) id = `PC-${generateId()}`;
      else if (label && label.toLowerCase().includes('serveur')) id = `SRV-${generateId()}`;
      else if (label && label.toLowerCase().includes('cloud')) id = `cloud-${generateId()}`;
      else if (label && label.toLowerCase().includes('firewall')) id = `fw-${generateId()}`;

      let newNode = { id, type: 'custom', position, data: { label, color: '#9ca3af' }, style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: '8px', padding: '10px', width: 140, textAlign: 'center' } };

      if (type === 'infraBox') {
         newNode.type = 'infraBox'; newNode.style = { width: 700, height: 500, zIndex: -10 }; newNode.data.color = '#6b7280'; newNode.data.locked = true; newNode.draggable = false;
      } else if (type === 'note') {
         newNode.type = 'note'; newNode.data.color = '#fef08a';
      }
      
      const newNodesList = nodes.concat(newNode); setNodes(newNodesList); takeSnapshot(newNodesList, edges);
  }, [reactFlowInstance, nodes, edges, setNodes, takeSnapshot]);

  const onSave = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "architecture_reseau.json");
      document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    }
  }, [reactFlowInstance]);

  const onLoad = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const flow = JSON.parse(e.target.result);
        if (flow) { 
            setNodes(flow.nodes || []); setEdges(flow.edges || []); setCurrentView('main'); 
            takeSnapshot(flow.nodes || [], flow.edges || []);
        }
      }; reader.readAsText(file);
    }
  }, [setNodes, setEdges, takeSnapshot]);

  const onExportImage = useCallback(() => {
    if (reactFlowWrapper.current === null) return;
    toPng(reactFlowWrapper.current, { filter: (node) => !(node?.classList?.contains('react-flow__minimap') || node?.classList?.contains('react-flow__controls')) })
      .then((dataUrl) => { const a = document.createElement('a'); a.setAttribute('download', 'schema_reseau.png'); a.setAttribute('href', dataUrl); a.click(); });
  }, []);

  const generateSchema = (config, append = false) => {
    const existingNodes = append ? [...nodes] : []; const existingEdges = append ? [...edges] : [];
    const newNodes = []; const newEdges = [];

    let centralRouter = existingNodes.find(n => n.data?.label?.includes('Routeur Central') || n.data?.label?.includes('Switch L3'));
    let routerId; let currentLanY = 150; let currentDmzY = 150; let startLanY = 150; let startDmzY = 150;

    if (append && existingNodes.length > 0) {
        const lanGroups = existingNodes.filter(n => n.type === 'customGroup' && n.position.x < 400);
        if (lanGroups.length > 0) { currentLanY = Math.max(...lanGroups.map(n => n.position.y + (n.style?.height || 280))) + 80; startLanY = currentLanY; }
        const dmzGroups = existingNodes.filter(n => n.type === 'customGroup' && n.position.x > 600);
        if (dmzGroups.length > 0) { currentDmzY = Math.max(...dmzGroups.map(n => n.position.y + (n.style?.height || 280))) + 80; startDmzY = currentDmzY; }
    }

    if (!centralRouter) {
        routerId = `R-${generateId()}`;
        const isL3 = config.centralDevice === 'l3switch';
        const centralLabel = isL3 ? 'Switch L3\nPasserelle' : 'Routeur Central\nPasserelle';
        const centralColor = isL3 ? '#8b5cf6' : '#3b82f6'; const centralBg = isL3 ? '#4c1d95' : '#1e3a8a';

        newNodes.push({ id: routerId, type: 'custom', position: { x: 480, y: 350 }, data: { label: centralLabel, network: 'main', color: centralColor }, style: { background: centralBg, color: '#eff6ff', border: `2px solid ${centralColor}`, borderRadius: '12px', padding: '15px', width: 180, textAlign: 'center', fontWeight: 'bold', boxShadow: `0 0 15px ${centralColor}66` } });
        
        if (config.generateCloudFw) {
            const cloudId = `cloud-${generateId()}`; const fwId = `fw-${generateId()}`;
            newNodes.push({ id: cloudId, type: 'custom', position: { x: 510, y: 30 }, data: { label: 'Cloud (Internet)', network: 'main', color: '#a8a29e' }, style: { background: '#44403c', color: 'white', border: '1px dashed #a8a29e', borderRadius: '8px', padding: '10px', width: 160, textAlign: 'center' } });
            newNodes.push({ id: fwId, type: 'custom', position: { x: 530, y: 160 }, data: { label: 'Firewall', network: 'main', color: '#ef4444' }, style: { background: '#7f1d1d', color: 'white', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', width: 120, textAlign: 'center' } });
            newEdges.push({ id: `e-${cloudId}-${fwId}`, source: cloudId, target: fwId, type: 'custom', animated: true, data: { type: 'fiber', bandwidth: '10G', srcPort: 's0/0', dstPort: 'eth0' } });
            newEdges.push({ id: `e-${fwId}-${routerId}`, source: fwId, target: routerId, type: 'custom', animated: true, data: { type: 'copper', bandwidth: '1G', srcPort: 'g0/1', dstPort: 'g0/0' } });
        }
    } else { routerId = centralRouter.id; }

    const colorPaletteLAN = ['#22c55e', '#14b8a6', '#84cc16', '#10b981']; const colorPaletteDMZ = ['#f97316', '#ef4444', '#f59e0b', '#f43f5e'];
    let localVlanCounter = 10;

    const processNetworks = (networksArray, isLan) => {
        let currentY = isLan ? currentLanY : currentDmzY;
        const palette = isLan ? colorPaletteLAN : colorPaletteDMZ;

        networksArray.forEach((net, index) => {
            const groupId = `Group-${generateId()}`; const switchId = `SW-${generateId()}`;
            const colorBase = palette[index % palette.length]; 
            const groupW = 420; const groupH = config.generatePCs ? 280 : 120;
            const xBase = isLan ? 30 : 690;
            const currentVlan = net.vlan || String(localVlanCounter); 
            if (!net.vlan) localVlanCounter += 10;

            newNodes.push({ id: groupId, type: 'customGroup', position: { x: xBase, y: currentY }, data: { network: 'main', color: colorBase, label: net.name, locked: false }, style: { width: groupW, height: groupH } });
            
            let switchLabel = `Switch ${net.type}\n${net.name}`;
            if (net.ip) switchLabel += `\nIP: ${net.ip}/${net.mask}`;

            newNodes.push({ id: switchId, type: 'custom', parentNode: groupId, position: { x: (groupW - 160) / 2, y: 35 }, data: { label: switchLabel, network: 'main', color: colorBase }, style: { background: '#1f2937', color: '#f9fafb', border: `2px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 160, textAlign: 'center', whiteSpace: 'pre-wrap', boxShadow: `0 0 10px ${colorBase}66` } });
            
            newEdges.push({ id: `e-${routerId}-${switchId}`, source: routerId, target: switchId, type: 'custom', animated: true, data: { network: 'main', type: 'copper', bandwidth: '10G', vlanColor: colorBase, vlan: currentVlan, srcPort: `g0/${index+1}`, dstPort: 'g0/1' } });

            if (isLan && config.generatePCs) {
                for (let i = 1; i <= 2; i++) {
                    const pcId = `PC-${generateId()}`; 
                    let fakeIp = `192.168.1.${Math.floor(Math.random() * 240) + 10}`;
                    if (net.ip) { const baseIp = net.ip.substring(0, net.ip.lastIndexOf('.')); fakeIp = `${baseIp}.${Math.floor(Math.random() * 240) + 10}`; }

                    newNodes.push({ id: pcId, type: 'custom', parentNode: groupId, position: { x: i === 1 ? 40 : 260, y: 160 }, data: { label: `PC ${i}\nIP: ${fakeIp} (DHCP)`, network: switchId, color: colorBase }, style: { background: '#1f2937', color: '#f9fafb', border: `1px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 120, textAlign: 'center' } });
                    newEdges.push({ id: `e-${switchId}-${pcId}`, source: switchId, target: pcId, type: 'custom', animated: true, data: { network: switchId, type: 'copper', bandwidth: '1G', vlanColor: colorBase, vlan: currentVlan, srcPort: `fa0/${i}`, dstPort: 'eth0' } });
                }
            } else if (!isLan && config.generatePCs) {
                const srvId = `SRV-${generateId()}`; 
                let fakeIp = `10.0.0.${Math.floor(Math.random() * 240) + 10}`;
                if (net.ip) { const baseIp = net.ip.substring(0, net.ip.lastIndexOf('.')); fakeIp = `${baseIp}.${Math.floor(Math.random() * 240) + 10}`; }

                newNodes.push({ id: srvId, type: 'custom', parentNode: groupId, position: { x: (groupW - 140) / 2, y: 160 }, data: { label: `Serveur Web\nIP: ${fakeIp} (DHCP)`, network: switchId, color: colorBase }, style: { background: '#7c2d12', color: '#f9fafb', border: `1px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 140, textAlign: 'center' } });
                newEdges.push({ id: `e-${switchId}-${srvId}`, source: switchId, target: srvId, type: 'custom', animated: true, data: { network: switchId, type: 'fiber', bandwidth: '10G', vlanColor: colorBase, vlan: currentVlan, srcPort: 'g0/1', dstPort: 'eth0' } });
            }
            currentY += groupH + 80; 
        }); 
        if(isLan) currentLanY = currentY; else currentDmzY = currentY;
    };

    const lans = config.networks.filter(n => n.type === 'LAN');
    const dmzs = config.networks.filter(n => n.type === 'DMZ');

    processNetworks(lans, true); processNetworks(dmzs, false);

    if (config.generateInfra) {
        const infraY = append ? Math.min(startLanY, startDmzY) - 40 : 120; const infraMaxY = Math.max(currentLanY, currentDmzY); const infraHeight = Math.max(400, infraMaxY - infraY - 20);
        newNodes.push({ id: `INFRA-${generateId()}`, type: 'infraBox', draggable: false, position: { x: 0, y: infraY }, data: { label: config.infraName || 'Infrastructure', color: '#6b7280', locked: true }, style: { width: 1140, height: infraHeight, zIndex: -10 } });
    }
    
    const finalNodes = append ? [...existingNodes, ...newNodes] : newNodes;
    const finalEdges = append ? [...existingEdges, ...newEdges] : newEdges;
    
    setNodes(finalNodes); setEdges(finalEdges); 
    if (!append) setCurrentView('main');
    setShowPCs(true); takeSnapshot(finalNodes, finalEdges);
  };

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <ErrorBoundary>
      <FlowContext.Provider value={{ showIPs, nodeWarnings, pingPathEdges, pingSource, pingTarget, pingMode, toggleLock, unlinkGroup, triggerDelete }}>
        <style>{pingStyles}</style>
        <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
          
          {/* 🛠️ SIDEBAR ET BOUTON RÉTRACTABLE FIXÉ CORRECTEMENT */}
          <div style={{ position: 'relative', width: isSidebarOpen ? 300 : 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0, backgroundColor: '#1f2937', borderRight: isSidebarOpen ? '1px solid #374151' : 'none', zIndex: 20 }}>
             <div style={{ width: 300, height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <Sidebar onGenerate={generateSchema} onSave={onSave} onLoad={onLoad} onExport={onExportImage} onExportAllCLI={exportAllCLI} />
             </div>
             
             {/* Le bouton Flèche fixé en position absolue pour éviter tout bug graphique */}
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ position: 'absolute', top: '50%', right: -24, transform: 'translateY(-50%)', width: 24, height: 48, background: '#1f2937', border: '1px solid #374151', borderLeft: 'none', color: '#9ca3af', borderRadius: '0 8px 8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 5px rgba(0,0,0,0.2)', zIndex: 21, padding: 0 }}>
                 {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
             </button>
          </div>
          
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '15px', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '12px 25px', borderRadius: '50px', border: '1px solid #4b5563', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
            {currentView === 'main' ? (
              <>
                <button onClick={undo} title="Annuler (Ctrl+Z)" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    <Undo2 size={18} /> Annuler
                </button>
                <div style={{ width: '1px', backgroundColor: '#4b5563' }} />

                <button onClick={verifyNetwork} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#8b5cf6', padding: '6px 12px', borderRadius: '20px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    <CheckCircle size={16} /> Vérifier
                </button>
                <div style={{ width: '1px', backgroundColor: '#4b5563' }} />
                
                <button onClick={() => { setPingMode(!pingMode); resetPing(); setRightPanel({isOpen:false}); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: pingMode ? '#ef4444' : '#10b981', padding: '6px 12px', borderRadius: '20px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: pingMode ? '0 0 10px #ef4444' : 'none' }}>
                    <Zap size={16} /> {pingMode ? 'Annuler Ping' : 'Tester (Ping)'}
                </button>
                <div style={{ width: '1px', backgroundColor: '#4b5563' }} />
                <button onClick={() => setShowPCs(!showPCs)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: showPCs ? '#10b981' : '#9ca3af', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    {showPCs ? <Monitor size={18} /> : <MonitorOff size={18} />} {showPCs ? 'PCs Affichés' : 'PCs Masqués'}
                </button>
                <div style={{ width: '1px', backgroundColor: '#4b5563' }} />
                <button onClick={() => setShowIPs(!showIPs)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: showIPs ? '#3b82f6' : '#9ca3af', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    {showIPs ? <Eye size={18} /> : <EyeOff size={18} />} {showIPs ? 'Détails Visibles' : 'Détails Masqués'}
                </button>
              </>
            ) : (
              <button onClick={() => setCurrentView('main')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  <ArrowLeft size={18} /> Retour à l'architecture globale
              </button>
            )}
          </div>

          {pingMode && (
             <div style={{ position: 'absolute', top: 90, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#ef4444', color: 'white', padding: '10px 30px', borderRadius: '30px', fontWeight: 'bold', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 5px 15px rgba(239,68,68,0.4)', animation: 'pulse 2s infinite' }}>
                {!pingSource ? '1️⃣ Cliquez sur un PC Source...' : !pingTarget ? '2️⃣ Cliquez sur un PC Destination...' : 'Recherche de route en cours...'}
             </div>
          )}

          {pingMessage && (
             <div style={{ position: 'absolute', top: 140, left: '50%', transform: 'translateX(-50%)', backgroundColor: pingMessage.type === 'success' ? '#10b981' : '#374151', border: `2px solid ${pingMessage.type === 'success' ? '#059669' : '#ef4444'}`, color: 'white', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', zIndex: 10, fontSize: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                {pingMessage.text}
             </div>
          )}

          <div style={{ flexGrow: 1, backgroundColor: '#111827' }} ref={reactFlowWrapper}>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnectLogic} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeDoubleClick={onNodeDoubleClick} onNodeClick={onNodeClick} onNodeDragStop={onNodeDragStop} onPaneClick={onPaneClick} onNodeContextMenu={onNodeContextMenu} onEdgeContextMenu={onEdgeContextMenu} onEdgeDoubleClick={onEdgeDoubleClick} colorMode="dark" fitView>
              <Controls />
              <MiniMap style={{ height: 100, width: 150, backgroundColor: '#1f2937' }} nodeColor="#4b5563" maskColor="rgba(0, 0, 0, 0.6)" />
              <Background variant="dots" gap={20} size={1} color="#374151" />
            </ReactFlow>
          </div>

          {contextMenu && (
            <div style={{ position: 'absolute', top: contextMenu.top, left: contextMenu.left, backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 5000, overflow: 'hidden', minWidth: '180px' }}>
               <div style={{ padding: '10px 15px', color: '#9ca3af', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #374151', backgroundColor: '#111827' }}>
                   {contextMenu.isEdge ? "Options du câble" : "Options de l'élément"}
               </div>
               <div onClick={() => { contextMenu.isEdge ? onEdgeDoubleClick(null, contextMenu.edge) : onNodeDoubleClick(null, contextMenu.node); }} style={{ padding: '10px 15px', color: 'white', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} className="menu-item">
                  ✏️ Modifier
               </div>
               {(!contextMenu.isEdge && (contextMenu.node?.type === 'customGroup' || contextMenu.node?.type === 'infraBox')) && (
                 <>
                   <div onClick={() => toggleLock(contextMenu.id)} style={{ padding: '10px 15px', color: 'white', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {contextMenu.node.data.locked ? <Unlock size={14}/> : <Lock size={14}/>} {contextMenu.node.data.locked ? 'Déverrouiller' : 'Verrouiller'}
                   </div>
                   <div onClick={() => unlinkGroup(contextMenu.id)} style={{ padding: '10px 15px', color: '#f59e0b', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Scissors size={14}/> Détacher le fond
                   </div>
                 </>
               )}
               <div style={{ height: '1px', backgroundColor: '#374151' }} />
               <div onClick={() => triggerDelete(contextMenu.id)} style={{ padding: '10px 15px', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trash2 size={14}/> Supprimer
               </div>
            </div>
          )}

          <div style={{ position: 'absolute', top: 0, right: rightPanel.isOpen ? 0 : '-350px', width: '350px', height: '100%', backgroundColor: '#1f2937', borderLeft: '1px solid #374151', boxShadow: '-5px 0 25px rgba(0,0,0,0.5)', transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #374151', backgroundColor: '#111827' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  ⚙️ {rightPanel.type === 'edge' ? 'Propriétés du Câble' : 'Propriétés'}
                </h3>
                <button onClick={() => { setRightPanel({isOpen: false, type: 'none'}); saveNodeData(); }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              <div style={{ padding: '20px', flexGrow: 1, overflowY: 'auto' }}>
                {rightPanel.type === 'note' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Texte de l'annotation</label>
                    <textarea value={editData.name} onChange={e => handleNodeChange('name', e.target.value)} style={{...inputStyle, height: '150px', resize: 'vertical'}} placeholder="Écrivez votre note ici..." />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Couleur du Post-it :</label>
                        <input type="color" value={editData.themeColor} onChange={e => handleNodeChange('themeColor', e.target.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', height: '30px', width: '40px', padding: 0 }} />
                    </div>
                    <button onClick={saveNodeData} style={{ width: '100%', padding: '12px', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Fermer le panneau</button>
                  </>
                )}

                {rightPanel.type === 'node' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Nom / Rôle</label>
                    <input value={editData.name} onChange={e => handleNodeChange('name', e.target.value)} style={inputStyle} placeholder="Exemple" />
                    
                    {!editData.isInfra && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flexGrow: 2 }}>
                              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>IP (Tape DHCP si auto)</label>
                              <input value={editData.ip} onChange={e => handleNodeChange('ip', e.target.value)} style={inputStyle} placeholder="192.168.1.0" />
                          </div>
                          <div style={{ width: '80px' }}>
                              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>CIDR</label>
                              <input value={editData.mask} onChange={e => handleNodeChange('mask', e.target.value)} style={inputStyle} placeholder="24" />
                          </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Couleur :</label>
                        <input type="color" value={editData.themeColor} onChange={e => handleNodeChange('themeColor', e.target.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', height: '30px', width: '40px', padding: 0 }} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => setRightPanel({ isOpen: false, type: 'none' })} style={{ width: '100%', padding: '12px', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Fermer le panneau</button>
                        
                        {editData.id?.startsWith('SW-') && (
                            <button onClick={() => { setRightPanel({ isOpen: false, type: 'none' }); setCurrentView(editData.id); }} style={{ width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.4)' }}>🔍 Entrer dans le Sous-Réseau</button>
                        )}
                    </div>
                    
                    {editData.id?.startsWith('SW-') && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#10b981' }}>➕ Ajout Rapide d'Appareil</h4>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <select value={quickAddData.type} onChange={e => setQuickAddData({...quickAddData, type: e.target.value})} style={{...inputStyle, flex: 1, marginBottom: 0}}>
                                    <option value="PC">PC</option>
                                    <option value="Serveur">Serveur</option>
                                </select>
                                <input value={quickAddData.vlan} onChange={e => setQuickAddData({...quickAddData, vlan: e.target.value})} style={{...inputStyle, width: '70px', marginBottom: 0}} placeholder="VLAN" />
                            </div>
                            <input value={quickAddData.name} onChange={e => setQuickAddData({...quickAddData, name: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} placeholder="Nom (ex: PC Secrétariat)" />
                            <input value={quickAddData.ip} onChange={e => setQuickAddData({...quickAddData, ip: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} placeholder="IP (ou DHCP)" />
                            
                            <button onClick={handleQuickAdd} style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ajouter l'appareil</button>
                        </div>
                    )}

                    {(editData.name.toLowerCase().includes('switch') || editData.name.toLowerCase().includes('routeur')) && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                            <button onClick={generateCLI} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.4)' }}>
                                <Terminal size={18} /> Générer Script Cisco (CLI)
                            </button>
                            {cliScript && (
                                <div style={{ position: 'relative', marginTop: '10px' }}>
                                    <textarea readOnly value={cliScript} style={{ width: '100%', height: '150px', backgroundColor: '#0f172a', color: '#38bdf8', padding: '10px', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', resize: 'none', boxSizing: 'border-box' }} />
                                    <button onClick={handleCopyCLI} style={{ position: 'absolute', top: '10px', right: '10px', background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
                                        {cliCopied ? <Check size={12} /> : <Copy size={12} />} {cliCopied ? 'Copié' : 'Copier'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                  </>
                )}

                {rightPanel.type === 'edge' && (
                  <>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Type de Câble</label>
                    <select value={editEdgeData.type} onChange={e => handleEdgeChange('type', e.target.value)} style={{...inputStyle, cursor: 'pointer'}}>
                        <option value="copper">Cuivre (Trait plein)</option>
                        <option value="fiber">Fibre Optique (Tireté bleu)</option>
                        <option value="console">Câble Console (Pointillé rouge)</option>
                    </select>

                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Bande Passante</label>
                    <select value={editEdgeData.bandwidth} onChange={e => handleEdgeChange('bandwidth', e.target.value)} style={{...inputStyle, cursor: 'pointer'}}>
                        <option value="100M">100 Mbps (Fin)</option>
                        <option value="1G">1 Gbps (Standard)</option>
                        <option value="10G">10 Gbps (Épais)</option>
                    </select>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flexGrow: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Port Source</label>
                            <input value={editEdgeData.srcPort} onChange={e => handleEdgeChange('srcPort', e.target.value)} style={inputStyle} placeholder="ex: fa0/1" />
                        </div>
                        <div style={{ flexGrow: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Port Dest.</label>
                            <input value={editEdgeData.dstPort} onChange={e => handleEdgeChange('dstPort', e.target.value)} style={inputStyle} placeholder="ex: g0/1" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ flexGrow: 1 }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>VLAN (ID)</label>
                          <input value={editEdgeData.vlan} onChange={e => handleEdgeChange('vlan', e.target.value)} style={{...inputStyle, marginBottom: 0}} placeholder="ex: 10, Trunk..." />
                        </div>
                        <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Couleur</label>
                          <input type="color" value={editEdgeData.vlanColor} onChange={e => handleEdgeChange('vlanColor', e.target.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', height: '30px', width: '40px', padding: 0 }} />
                        </div>
                    </div>

                    <button onClick={() => setRightPanel({ isOpen: false, type: 'none' })} style={{ width: '100%', padding: '12px', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Fermer le panneau</button>
                  </>
                )}
              </div>
          </div>

        </div>
      </FlowContext.Provider>
    </ErrorBoundary>
  );
}

export default function App() { return <ReactFlowProvider><DnDFlow /></ReactFlowProvider>; }