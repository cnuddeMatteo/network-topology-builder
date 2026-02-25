import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, ReactFlowProvider, Handle, Position, NodeResizer, BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { toPng } from 'html-to-image';
import { Cloud, Shield, Router, Network, Monitor, Server, Lock, Unlock, Scissors, Trash2, Play, Maximize, AlertTriangle, MonitorOff, Eye, EyeOff, ArrowLeft, Zap, X, CheckCircle } from 'lucide-react';
import 'reactflow/dist/style.css';
import Sidebar from './Sidebar';

// 🛠️ SÉCURITÉ 1 : Initialisation du contexte par défaut
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

// 🧠 OUTIL CIDR SÉCURISÉ
const ipToInt = (ip) => {
    if (!ip) return 0;
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
const isIpInSubnet = (ip, subnetIp, cidr) => {
    if (!ip || !subnetIp || !cidr || ip.toUpperCase() === 'DHCP') return true; 
    const mask = -1 << (32 - parseInt(cidr, 10));
    return (ipToInt(ip) & mask) === (ipToInt(subnetIp) & mask);
};

// --- CÂBLES SÉCURISÉS ---
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }) => {
  // 🛠️ SÉCURITÉ 2 : Fallback si le contexte n'est pas encore prêt
  const ctx = useContext(FlowContext) || {};
  const showIPs = ctx.showIPs !== false; 
  const pingPathEdges = ctx.pingPathEdges || [];

  // 🛠️ SÉCURITÉ 3 : Prévenir le crash de dessin du câble
  if (sourceX === undefined || targetX === undefined) return null;

  const [edgePath, labelX, labelY] = getBezierPath({ 
      sourceX, sourceY, 
      sourcePosition: sourcePosition || Position.Bottom, 
      targetX, targetY, 
      targetPosition: targetPosition || Position.Top 
  });

  let edgeStyle = { ...style, strokeWidth: 2, transition: 'all 0.3s ease' };
  let edgeColor = data?.vlanColor || '#9ca3af'; 

  const isPinging = pingPathEdges.includes(id);

  if (isPinging) {
    edgeStyle = { ...edgeStyle, stroke: '#10b981', strokeWidth: 4, filter: 'drop-shadow(0 0 8px #10b981)' };
    edgeColor = '#10b981';
  } else if (data?.type === 'fiber') {
    edgeStyle = { ...edgeStyle, stroke: '#60a5fa', strokeDasharray: '5,5' }; 
    edgeColor = '#60a5fa';
  } else if (data?.type === 'console') {
    edgeStyle = { ...edgeStyle, stroke: '#ef4444', strokeDasharray: '2,3' }; 
    edgeColor = '#ef4444';
  } else {
    edgeStyle = { ...edgeStyle, stroke: edgeColor }; 
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} className={isPinging ? "animated-ping-edge react-flow__edge-path" : "react-flow__edge-path"} />
      <EdgeLabelRenderer>
        {showIPs && data?.vlan && (
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all', background: edgeColor, color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 100 }} className="nodrag nopan">
            VLAN {data.vlan}
          </div>
        )}
        {showIPs && data?.srcPort && (
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX) * 0.4}px,${sourceY + (labelY - sourceY) * 0.4}px)`, pointerEvents: 'none', background: '#1f2937', color: '#9ca3af', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', border: '1px solid #374151', zIndex: 50 }}>
            {data.srcPort}
          </div>
        )}
        {showIPs && data?.dstPort && (
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${targetX - (targetX - labelX) * 0.4}px,${targetY - (targetY - labelY) * 0.4}px)`, pointerEvents: 'none', background: '#1f2937', color: '#9ca3af', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', border: '1px solid #374151', zIndex: 50 }}>
            {data.dstPort}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

// --- ÉQUIPEMENT SÉCURISÉ ---
const CustomNode = ({ id, data }) => {
  const ctx = useContext(FlowContext) || {};
  const showIPs = ctx.showIPs !== false;
  const nodeWarnings = ctx.nodeWarnings || {};
  const pingSource = ctx.pingSource;
  const pingTarget = ctx.pingTarget;
  const pingMode = ctx.pingMode;

  const lines = data?.label ? data.label.split('\n') : [];
  const title = lines[0] || 'Appareil';
  const details = lines.slice(1).join('\n');
  const warning = nodeWarnings[id];

  const isPingSource = pingSource === id;
  const isPingTarget = pingTarget === id;
  const isPingSelectable = pingMode && !isPingSource && !isPingTarget && (title.includes('PC') || title.includes('Serveur'));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: (isPingSource || isPingTarget) ? 'scale(1.1)' : 'scale(1)', cursor: isPingSelectable ? 'crosshair' : 'default' }}>
      {isPingSource && <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '12px', border: '3px dashed #3b82f6', animation: 'spin 4s linear infinite', zIndex: -1 }} />}
      {isPingTarget && <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '12px', border: '3px dashed #10b981', zIndex: -1 }} />}

      <Handle type="target" position={Position.Top} style={{ background: '#9ca3af', width: 6, height: 6, border: 'none' }} />
      {warning && (
        <div title={warning} style={{ position: 'absolute', top: -8, right: -8, zIndex: 100, color: '#ef4444', background: '#fee2e2', borderRadius: '50%', padding: '4px', display: 'flex', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)', cursor: 'help' }}>
            <AlertTriangle size={14} />
        </div>
      )}
      <div style={{ pointerEvents: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        {getIconForLabel(title, data?.color || '#f9fafb', 24)}
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#f9fafb' }}>{title}</div>
        {showIPs && details && <div style={{ fontSize: '10px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{details}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#9ca3af', width: 6, height: 6, border: 'none' }} />
    </div>
  );
};

// --- GROUPE RÉSEAU ---
const CustomGroupNode = ({ id, data, selected }) => {
  const { toggleLock, unlinkGroup, triggerDelete } = useContext(FlowContext) || {};
  const [hover, setHover] = useState(false);
  const btnStyle = { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#374151', color: 'white', border: `1px solid ${data?.color || '#333'}` };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', height: '100%' }}>
      <NodeResizer minWidth={250} minHeight={150} isVisible={selected && !data?.locked} lineStyle={{ borderColor: data?.color }} handleStyle={{ background: data?.color, width: 8, height: 8, borderRadius: 4 }} />
      <div style={{ width: '100%', height: '100%', border: `2px dashed ${data?.color || '#333'}`, backgroundColor: `${data?.color || '#333'}1A`, borderRadius: '12px', position: 'relative' }}>
         {data?.label && <div style={{ position: 'absolute', top: -14, left: 30, background: '#111827', padding: '2px 15px', color: data.color, fontWeight: 'bold', borderRadius: '6px', border: `1px solid ${data.color}`, fontSize: '12px' }}>{data.label}</div>}
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

// --- ZONE INFRA ---
const InfraBoxNode = ({ id, data, selected }) => {
  const { toggleLock, unlinkGroup, triggerDelete } = useContext(FlowContext) || {};
  const [hover, setHover] = useState(false);
  const boxColor = data?.color || '#6b7280';
  const btnStyle = { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#374151', color: 'white', border: `1px solid ${boxColor}` };

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', height: '100%' }}>
      <NodeResizer minWidth={400} minHeight={300} isVisible={selected && !data?.locked} lineStyle={{ borderColor: boxColor }} handleStyle={{ background: boxColor, width: 8, height: 8, borderRadius: 4 }} />
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

const nodeTypes = { custom: CustomNode, customGroup: CustomGroupNode, infraBox: InfraBoxNode };
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
  const [presentationMode, setPresentationMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const [rightPanel, setRightPanel] = useState({ isOpen: false, type: 'none' }); 
  const [editData, setEditData] = useState({ id: null, name: '', ip: '', mask: '', themeColor: '#3b82f6', isInfra: false });
  const [editEdgeData, setEditEdgeData] = useState({ id: null, type: 'copper', srcPort: '', dstPort: '', vlan: '', vlanColor: '#9ca3af' });

  const [pingMode, setPingMode] = useState(false);
  const [pingSource, setPingSource] = useState(null);
  const [pingTarget, setPingTarget] = useState(null);
  const [pingPathEdges, setPingPathEdges] = useState([]);
  const [pingMessage, setPingMessage] = useState(null);

  const [nodeWarnings, setNodeWarnings] = useState({});

  // 🛠️ VÉRIFICATION MANUELLE SÉCURISÉE
  const verifyNetwork = () => {
    const warnings = {};
    const ipMap = {};

    nodes.forEach(n => {
        if (n.type !== 'custom') return;
        const isFinalDevice = n.data?.label?.includes('PC') || n.data?.label?.includes('Serveur');
        const lines = (n.data?.label || '').split('\n');
        const ipLine = lines.find(l => l.includes('IP:'));
        
        let pcIp = null;

        if (ipLine) {
            pcIp = ipLine.replace('IP:', '').replace('(DHCP)', '').trim();
            if (pcIp && pcIp.toUpperCase() !== 'DHCP') {
                if (ipMap[pcIp]) { 
                    warnings[n.id] = `Conflit : L'IP ${pcIp} est en doublon !`; 
                    warnings[ipMap[pcIp]] = `Conflit : L'IP ${pcIp} est en doublon !`; 
                } else { ipMap[pcIp] = n.id; }
            }
        } else if (isFinalDevice) { 
            warnings[n.id] = "Attention : Aucune IP configurée."; 
        }

        if (pcIp && isFinalDevice && n.data?.network) {
            const switchNode = nodes.find(sw => sw.id === n.data.network);
            if (switchNode) {
                const switchLines = (switchNode.data?.label || '').split('\n');
                const switchIpLine = switchLines.find(l => l.match(/\d+\.\d+\.\d+\.\d+\/\d+/));
                if (switchIpLine) {
                    const ipMatch = switchIpLine.match(/(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
                    if (ipMatch) {
                        if (!isIpInSubnet(pcIp, ipMatch[1], ipMatch[2])) {
                            warnings[n.id] = `Erreur : L'IP ${pcIp} n'est pas dans le sous-réseau (${ipMatch[1]}/${ipMatch[2]}).`;
                        }
                    }
                }
            }
        }
    });

    setNodeWarnings(warnings);

    if (Object.keys(warnings).length === 0 && nodes.length > 0) {
        alert("✅ Tout est parfait ! Aucun conflit IP ni erreur de routage détecté.");
    }
  };

  const getPath = useCallback((srcId, tgtId) => {
    const queue = [[srcId]];
    const visited = new Set([srcId]);
    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
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
        // Vérification VLAN/sous-réseau : ne considérer le chemin valide
        // que si les VLANS sont compatibles ou s'il y a un routeur entre eux.
        let passable = true;
        // Trouver un VLAN de référence si présent
        const firstEdgeWithVlan = edges.find(ed => pEdges.includes(ed.id) && ed.data?.vlan);
        const requiredVlan = firstEdgeWithVlan?.data?.vlan || null;

        if (requiredVlan) {
          // Si le chemin touche une DMZ (ex: serveur DMZ ou switch label 'Switch DMZ'),
          // autoriser l'accès quel que soit le VLAN (politique demandée).
          const touchesDMZ = pathNodes.some(nid => {
            const nodeObj = nodes.find(no => no.id === nid);
            return nodeObj?.id?.startsWith('SRV-') || nodeObj?.data?.label?.includes('Switch DMZ') || (nodeObj?.type === 'customGroup' && nodeObj?.data?.label?.toLowerCase().includes('dmz'));
          });

          if (!touchesDMZ) {
            for (let i = 0; i < pEdges.length; i++) {
              const edgeObj = edges.find(ed => ed.id === pEdges[i]);
              if (!edgeObj) continue;
              const edgeVlan = edgeObj.data?.vlan;
              if (edgeVlan && edgeVlan !== requiredVlan) {
                // autoriser si un routeur est à l'une des extrémités de ce lien
                const a = pathNodes[i]; const b = pathNodes[i+1];
                const aIsRouter = a.startsWith('R-'); const bIsRouter = b.startsWith('R-');
                if (!(aIsRouter || bIsRouter)) { passable = false; break; }
              }
            }
          }
        }

        if (!passable) {
          setPingMessage({ text: 'Échec : VLAN/sous-réseau incompatible. ❌', type: 'error' });
        } else {
          setPingPathEdges(pEdges);
          setPingMessage({ text: 'Ping Réussi ! ✅', type: 'success' });
        }
    } else {
        setPingMessage({ text: 'Échec : Aucune route physique trouvée. ❌', type: 'error' });
    }
    setTimeout(resetPing, 4000); 
  }, [edges, getPath, nodes]);

  const getCascadingIds = useCallback((id, currentNodes) => {
    let ids = [id];
    const target = currentNodes.find(n => n.id === id);
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
    setNodes((nds) => {
      const idsToDelete = getCascadingIds(id, nds);
      setEdges((eds) => eds.filter((e) => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target) && e.id !== id));
      return nds.filter((n) => !idsToDelete.includes(n.id));
    });
    setContextMenu(null); setRightPanel({ isOpen: false, type: 'none' });
  }, [setNodes, setEdges, getCascadingIds]);

  const toggleLock = useCallback((id) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, draggable: n.data?.locked, data: { ...n.data, locked: !n.data?.locked } } : n));
    setContextMenu(null);
  }, [setNodes]);

  const unlinkGroup = useCallback((id) => {
    setNodes((nds) => {
      const groupNode = nds.find(n => n.id === id);
      if (!groupNode) return nds;
      return nds.map(n => {
        if (n.parentNode === id) {
          const absX = groupNode.position.x + n.position.x; const absY = groupNode.position.y + n.position.y;
          const { parentNode, ...restNode } = n; 
          return { ...restNode, position: { x: absX, y: absY } };
        }
        return n;
      });
    });
    setContextMenu(null);
  }, [setNodes]);

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
    setEditEdgeData({ id: edge.id, type: edge.data?.type || 'copper', srcPort: edge.data?.srcPort || '', dstPort: edge.data?.dstPort || '', vlan: edge.data?.vlan || '', vlanColor: edge.data?.vlanColor || '#9ca3af' });
    setRightPanel({ isOpen: true, type: 'edge' });
  }, [pingMode]);

  const onNodeDoubleClick = useCallback((event, node) => {
    if(pingMode) return; setContextMenu(null);
    let targetNode = node;
    if (node.type === 'customGroup') {
      const switchNode = nodes.find(n => n.parentNode === node.id && n.id.startsWith('SW-'));
      if (switchNode) targetNode = switchNode; else return; 
    }
    if (targetNode.type === 'infraBox') {
       setEditData({ id: targetNode.id, name: targetNode.data?.label || '', ip: '', mask: '', themeColor: targetNode.data?.color || '#6b7280', isInfra: true });
       setRightPanel({ isOpen: true, type: 'node' }); return;
    }
    if (!targetNode.data?.label) return; 
    const lines = targetNode.data.label.split('\n');
    let name = lines[0] || ''; let ip = '', mask = '';
    if (lines[1]) {
        const ipStr = lines[1].replace('IP:', '').trim();
        if (ipStr.includes('(DHCP)')) ip = 'DHCP';
        else { const ipParts = ipStr.split('/'); ip = ipParts[0].trim(); mask = ipParts[1] ? ipParts[1].trim() : ''; }
    }
    setEditData({ id: targetNode.id, name, ip, mask, themeColor: targetNode.data?.color || '#3b82f6', isInfra: false });
    setRightPanel({ isOpen: true, type: 'node' });
  }, [nodes, pingMode]);

  const saveNodeData = () => {
    setNodes((nds) => nds.map(n => {
      if (editData.isInfra && n.id === editData.id) { n.data.label = editData.name; n.data.color = editData.themeColor; return n; }
      if (n.id === editData.id) {
        let newLabel = editData.name;
        if (editData.ip && !editData.isInfra) {
            if (editData.ip.toUpperCase() === 'DHCP') {
                const fakeIp = newLabel.includes('Serveur') ? `10.0.0.${Math.floor(Math.random() * 240)+10}` : `192.168.1.${Math.floor(Math.random() * 240)+10}`;
                newLabel += `\nIP: ${fakeIp} (DHCP)`;
            } else { newLabel += `\nIP: ${editData.ip}`; if (editData.mask) newLabel += `/${editData.mask}`; }
        }
        n.data.label = newLabel;
      }
      const isGroupOrSwitch = editData.id.startsWith('SW-') || editData.id.startsWith('Group-');
      const targetNode = nds.find(node => node.id === editData.id);

      if (isGroupOrSwitch && !editData.isInfra) {
          const groupId = editData.id.startsWith('SW-') ? targetNode?.parentNode : editData.id;
          if (groupId && (n.id === groupId || n.parentNode === groupId)) {
              n.data.color = editData.themeColor;
              if (n.type === 'customGroup') {
                  const lines = editData.name.split('\n'); n.data.label = lines[1] || lines[0] || 'Réseau';
                  n.style = { ...n.style, border: `2px dashed ${editData.themeColor}`, backgroundColor: `${editData.themeColor}1A` };
              } else {
                  n.style = { ...n.style, border: `2px solid ${editData.themeColor}` };
                  if (n.id.startsWith('SW-')) n.style.boxShadow = `0 0 10px ${editData.themeColor}66`;
              }
          }
      } else if (!isGroupOrSwitch && !editData.isInfra && n.id === editData.id) {
          n.data.color = editData.themeColor;
          const isHeavy = n.id.startsWith('R-') || n.id.startsWith('fw-') || n.id.startsWith('cloud-');
          n.style = { ...n.style, border: `${isHeavy ? '2px' : '1px'} solid ${editData.themeColor}` };
          if (n.id.startsWith('R-')) n.style.boxShadow = `0 0 10px ${editData.themeColor}66`;
      }
      return n;
    }));
    setRightPanel({ isOpen: false, type: 'none' });
  };

  const saveEdgeData = () => {
      setEdges((eds) => eds.map(e => e.id === editEdgeData.id ? { ...e, data: { ...e.data, ...editEdgeData } } : e));
      setRightPanel({ isOpen: false, type: 'none' });
  };

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

  // 🛠️ SÉCURITÉ 4 : On gère le Focus sans déclencher de boucle de rendu infinie
  useEffect(() => {
    setNodes(nds => {
        let hasChanges = false;
        const newNodes = nds.map(n => {
            let isVisible = true;
            if (currentView === 'main') {
                const isPC = typeof n.data?.label === 'string' && (n.data.label.includes('PC') || n.data.label.includes('Serveur'));
                isVisible = isPC ? showPCs : true;
            } else {
                const switchEdges = edges.filter(e => e.source === currentView || e.target === currentView);
                const switchVlans = new Set(switchEdges.map(e => e.data?.vlan).filter(Boolean));
                const isDirectFamily = n.id === currentView || n.data?.network === currentView || n.id === nds.find(node => node.id === currentView)?.parentNode;
                const isRouter = n.id.startsWith('R-') || n.type === 'infraBox';
                const sharesVlan = edges.some(e => (e.source === n.id || e.target === n.id) && switchVlans.has(e.data?.vlan));
                isVisible = isDirectFamily || isRouter || sharesVlan;
            }
            if (n.hidden !== !isVisible) hasChanges = true;
            return { ...n, hidden: !isVisible, style: { ...n.style, opacity: isVisible ? 1 : 0.2, filter: isVisible ? 'none' : 'grayscale(100%)' } };
        });
        return hasChanges ? newNodes : nds; // On ne retourne un nouveau tableau QUE si l'affichage change
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
  }, [currentView, showPCs, reactFlowInstance]); // Plus de dépendance à `edges` ou `nodes` ici !

  const onConnectLogic = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, type: 'custom', animated: true, data: { network: currentView === 'main' ? null : currentView, type: 'copper', srcPort: '', dstPort: '', vlan: '', vlanColor: '#9ca3af' } }, eds));
  }, [setEdges, currentView]);

  // Drag & Drop handlers (manquants auparavant — causaient un crash à l'affichage)
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow/type');
    const label = event.dataTransfer.getData('application/reactflow/label');
    if (!type) return;
    const position = reactFlowInstance ? reactFlowInstance.project({ x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top }) : { x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top };

    let id = generateId();
    if (type === 'infraBox') id = `INFRA-${generateId()}`;
    else if (label && label.toLowerCase().includes('switch')) id = `SW-${generateId()}`;
    else if (label && label.toLowerCase().includes('pc')) id = `PC-${generateId()}`;
    else if (label && label.toLowerCase().includes('serveur')) id = `SRV-${generateId()}`;
    else if (label && label.toLowerCase().includes('cloud')) id = `cloud-${generateId()}`;
    else if (label && label.toLowerCase().includes('firewall')) id = `fw-${generateId()}`;

    const newNode = {
      id,
      type: type === 'infraBox' ? 'infraBox' : 'custom',
      position,
      data: { label },
      style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: '8px', padding: '10px', width: 140, textAlign: 'center' }
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance]);

  const onSave = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "architecture_reseau.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click(); downloadAnchorNode.remove();
    }
  }, [reactFlowInstance]);

  const onLoad = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const flow = JSON.parse(e.target.result);
        if (flow) { setNodes(flow.nodes || []); setEdges(flow.edges || []); setCurrentView('main'); }
      }; reader.readAsText(file);
    }
  }, [setNodes, setEdges]);

  const onExportImage = useCallback(() => {
    if (reactFlowWrapper.current === null) return;
    toPng(reactFlowWrapper.current, { filter: (node) => !(node?.classList?.contains('react-flow__minimap') || node?.classList?.contains('react-flow__controls')) })
      .then((dataUrl) => {
        const a = document.createElement('a'); a.setAttribute('download', 'schema_reseau.png'); a.setAttribute('href', dataUrl); a.click();
      });
  }, []);

  const generateSchema = (config, append = false) => {
    const existingNodes = append ? [...nodes] : [];
    const existingEdges = append ? [...edges] : [];
    const newNodes = []; const newEdges = [];

    let centralRouter = existingNodes.find(n => n.data?.label?.includes('Routeur Central'));
    let routerId; let currentLanY = 150; let currentDmzY = 150; let startLanY = 150; let startDmzY = 150;
    let vlanCounter = 10;

    if (append && existingNodes.length > 0) {
        const lanGroups = existingNodes.filter(n => n.type === 'customGroup' && n.position.x < 400);
        if (lanGroups.length > 0) { currentLanY = Math.max(...lanGroups.map(n => n.position.y + (n.style?.height || 280))) + 80; startLanY = currentLanY; }
        const dmzGroups = existingNodes.filter(n => n.type === 'customGroup' && n.position.x > 600);
        if (dmzGroups.length > 0) { currentDmzY = Math.max(...dmzGroups.map(n => n.position.y + (n.style?.height || 280))) + 80; startDmzY = currentDmzY; }
        const usedVlans = existingEdges.map(e => parseInt(e.data?.vlan)).filter(v => !isNaN(v));
        if (usedVlans.length > 0) vlanCounter = Math.max(...usedVlans) + 10;
    }

    if (!centralRouter) {
        routerId = `R-${generateId()}`;
        newNodes.push({ id: routerId, type: 'custom', position: { x: 480, y: 350 }, data: { label: 'Routeur Central\nPasserelle', network: 'main', color: '#3b82f6' }, style: { background: '#1e3a8a', color: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '15px', width: 180, textAlign: 'center', fontWeight: 'bold', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' } });
        if (config.generateCloudFw) {
            const cloudId = `cloud-${generateId()}`; const fwId = `fw-${generateId()}`;
            newNodes.push({ id: cloudId, type: 'custom', position: { x: 510, y: 30 }, data: { label: 'Cloud (Internet)', network: 'main', color: '#a8a29e' }, style: { background: '#44403c', color: 'white', border: '1px dashed #a8a29e', borderRadius: '8px', padding: '10px', width: 160, textAlign: 'center' } });
            newNodes.push({ id: fwId, type: 'custom', position: { x: 530, y: 160 }, data: { label: 'Firewall', network: 'main', color: '#ef4444' }, style: { background: '#7f1d1d', color: 'white', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', width: 120, textAlign: 'center' } });
            newEdges.push({ id: `e-${cloudId}-${fwId}`, source: cloudId, target: fwId, type: 'custom', animated: true, data: { type: 'fiber', srcPort: 's0/0', dstPort: 'eth0' } });
            newEdges.push({ id: `e-${fwId}-${routerId}`, source: fwId, target: routerId, type: 'custom', animated: true, data: { type: 'copper', srcPort: 'g0/1', dstPort: 'g0/0' } });
        }
    } else { routerId = centralRouter.id; }

    const colorPaletteLAN = ['#22c55e', '#14b8a6', '#84cc16', '#10b981']; const colorPaletteDMZ = ['#f97316', '#ef4444', '#f59e0b', '#f43f5e'];

    const addNetworks = (inputText, typeLabel, xBase, palette, isLan, startY) => {
        if (!inputText) return startY;
        const networks = inputText.split(',').map(s => s.trim()).filter(s => s !== ''); let currentY = startY;

        networks.forEach((netName, index) => {
            const groupId = `Group-${generateId()}`; const switchId = `SW-${generateId()}`;
            const colorBase = palette[index % palette.length]; const currentVlan = String(vlanCounter); vlanCounter += 10; 
            const groupW = 420; const groupH = config.generatePCs ? 280 : 120;

            newNodes.push({ id: groupId, type: 'customGroup', position: { x: xBase, y: currentY }, data: { network: 'main', color: colorBase, label: netName, locked: false }, style: { width: groupW, height: groupH } });
            newNodes.push({ id: switchId, type: 'custom', parentNode: groupId, position: { x: (groupW - 160) / 2, y: 35 }, data: { label: `${typeLabel}\n${netName}`, network: 'main', color: colorBase }, style: { background: '#1f2937', color: '#f9fafb', border: `2px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 160, textAlign: 'center', whiteSpace: 'pre-wrap', boxShadow: `0 0 10px ${colorBase}66` } });
            newEdges.push({ id: `e-${routerId}-${switchId}`, source: routerId, target: switchId, type: 'custom', animated: true, data: { network: 'main', type: 'copper', vlanColor: colorBase, vlan: currentVlan, srcPort: `g0/${index+1}`, dstPort: 'g0/1' } });

            if (isLan && config.generatePCs) {
                for (let i = 1; i <= 2; i++) {
                    const pcId = `PC-${generateId()}`; const fakeIp = `192.168.1.${Math.floor(Math.random() * 240) + 10}`;
                    newNodes.push({ id: pcId, type: 'custom', parentNode: groupId, position: { x: i === 1 ? 40 : 260, y: 160 }, data: { label: `PC ${i}\nIP: ${fakeIp} (DHCP)`, network: switchId, color: colorBase }, style: { background: '#1f2937', color: '#f9fafb', border: `1px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 120, textAlign: 'center' } });
                    newEdges.push({ id: `e-${switchId}-${pcId}`, source: switchId, target: pcId, type: 'custom', animated: true, data: { network: switchId, type: 'copper', vlanColor: colorBase, vlan: currentVlan, srcPort: `fa0/${i}`, dstPort: 'eth0' } });
                }
            } else if (!isLan && config.generatePCs) {
                const srvId = `SRV-${generateId()}`; const fakeIp = `10.0.0.${Math.floor(Math.random() * 240) + 10}`;
                newNodes.push({ id: srvId, type: 'custom', parentNode: groupId, position: { x: (groupW - 140) / 2, y: 160 }, data: { label: `Serveur Web\nIP: ${fakeIp} (DHCP)`, network: switchId, color: colorBase }, style: { background: '#7c2d12', color: '#f9fafb', border: `1px solid ${colorBase}`, borderRadius: '8px', padding: '10px', width: 140, textAlign: 'center' } });
                newEdges.push({ id: `e-${switchId}-${srvId}`, source: switchId, target: srvId, type: 'custom', animated: true, data: { network: switchId, type: 'fiber', vlanColor: colorBase, vlan: currentVlan, srcPort: 'g0/1', dstPort: 'eth0' } });
            }
            currentY += groupH + 80; 
        }); return currentY;
    };

    currentLanY = addNetworks(config.lans, 'Switch LAN', 30, colorPaletteLAN, true, currentLanY);
    currentDmzY = addNetworks(config.dmzs, 'Switch DMZ', 690, colorPaletteDMZ, false, currentDmzY);

    if (config.generateInfra) {
        const infraY = append ? Math.min(startLanY, startDmzY) - 40 : 120; const infraMaxY = Math.max(currentLanY, currentDmzY); const infraHeight = Math.max(400, infraMaxY - infraY - 20);
        newNodes.push({ id: `INFRA-${generateId()}`, type: 'infraBox', position: { x: 0, y: infraY }, data: { label: config.infraName || 'Infrastructure', color: '#6b7280', locked: false }, style: { width: 1140, height: infraHeight, zIndex: -10 } });
    }
    if (append) { setNodes([...existingNodes, ...newNodes]); setEdges([...existingEdges, ...newEdges]); } 
    else { setNodes(newNodes); setEdges(newEdges); setCurrentView('main'); }
    setShowPCs(true); 
  };

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '15px' };

  return (
    <FlowContext.Provider value={{ showIPs, nodeWarnings, pingPathEdges, pingSource, pingTarget, pingMode, toggleLock, unlinkGroup, triggerDelete }}>
      <style>{pingStyles}</style>
      <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        
        {!presentationMode && <Sidebar onGenerate={generateSchema} onSave={onSave} onLoad={onLoad} onExport={onExportImage} />}
        
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '15px', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '12px 25px', borderRadius: '50px', border: '1px solid #4b5563', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          {currentView === 'main' ? (
            <>
              {/* 🛠️ BOUTON DE VÉRIFICATION MANUELLE */}
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
              <div style={{ width: '1px', backgroundColor: '#4b5563' }} />
              <button onClick={() => setPresentationMode(!presentationMode)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: presentationMode ? '#f59e0b' : '#9ca3af', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {presentationMode ? <Maximize size={18} /> : <Play size={18} />} {presentationMode ? 'Quitter' : 'Présentation'}
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
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnectLogic} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} onNodeDoubleClick={onNodeDoubleClick} onNodeClick={onNodeClick} onPaneClick={onPaneClick} onNodeContextMenu={onNodeContextMenu} onEdgeContextMenu={onEdgeContextMenu} onEdgeDoubleClick={onEdgeDoubleClick} colorMode="dark" fitView>
            {!presentationMode && <Controls />}
            {!presentationMode && <MiniMap style={{ height: 100, width: 150, backgroundColor: '#1f2937' }} nodeColor="#4b5563" maskColor="rgba(0, 0, 0, 0.6)" />}
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
                ⚙️ {rightPanel.type === 'edge' ? 'Propriétés du Câble' : 'Propriétés de l\'Élément'}
              </h3>
              <button onClick={() => setRightPanel({isOpen: false, type: 'none'})} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <div style={{ padding: '20px', flexGrow: 1, overflowY: 'auto' }}>
              {rightPanel.type === 'node' && (
                <>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Nom / Rôle</label>
                  <input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveNodeData()} style={inputStyle} placeholder="Exemple" />
                  
                  {!editData.isInfra && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flexGrow: 2 }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>IP (Tape DHCP si auto)</label>
                            <input value={editData.ip} onChange={e => setEditData({...editData, ip: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveNodeData()} style={inputStyle} placeholder="192.168.1.0" />
                        </div>
                        <div style={{ width: '80px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>CIDR</label>
                            <input value={editData.mask} onChange={e => setEditData({...editData, mask: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveNodeData()} style={inputStyle} placeholder="24" />
                        </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Couleur :</label>
                      <input type="color" value={editData.themeColor} onChange={e => setEditData({...editData, themeColor: e.target.value})} style={{ background: 'none', border: 'none', cursor: 'pointer', height: '30px', width: '40px', padding: 0 }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={saveNodeData} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.4)' }}>💾 Enregistrer</button>
                      
                      {editData.id?.startsWith('SW-') && (
                          <button onClick={() => { setRightPanel({ isOpen: false, type: 'none' }); setCurrentView(editData.id); }} style={{ width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.4)' }}>🔍 Entrer dans le Sous-Réseau</button>
                      )}
                  </div>
                </>
              )}

              {rightPanel.type === 'edge' && (
                <>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Type de Câble</label>
                  <select value={editEdgeData.type} onChange={e => setEditEdgeData({...editEdgeData, type: e.target.value})} style={{...inputStyle, cursor: 'pointer'}}>
                      <option value="copper">Cuivre (Trait plein)</option>
                      <option value="fiber">Fibre Optique (Tireté bleu)</option>
                      <option value="console">Câble Console (Pointillé rouge)</option>
                  </select>

                  <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flexGrow: 1 }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Port Source</label>
                          <input value={editEdgeData.srcPort} onChange={e => setEditEdgeData({...editEdgeData, srcPort: e.target.value})} style={inputStyle} placeholder="ex: fa0/1" />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Port Dest.</label>
                          <input value={editEdgeData.dstPort} onChange={e => setEditEdgeData({...editEdgeData, dstPort: e.target.value})} style={inputStyle} placeholder="ex: g0/1" />
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ flexGrow: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>VLAN (ID)</label>
                        <input value={editEdgeData.vlan} onChange={e => setEditEdgeData({...editEdgeData, vlan: e.target.value})} style={{...inputStyle, marginBottom: 0}} placeholder="ex: 10, Trunk..." />
                      </div>
                      <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>Couleur</label>
                        <input type="color" value={editEdgeData.vlanColor} onChange={e => setEditEdgeData({...editEdgeData, vlanColor: e.target.value})} style={{ background: 'none', border: 'none', cursor: 'pointer', height: '30px', width: '40px', padding: 0 }} />
                      </div>
                  </div>

                  <button onClick={saveEdgeData} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.4)' }}>💾 Enregistrer</button>
                </>
              )}
            </div>
        </div>

      </div>
    </FlowContext.Provider>
  );
}

export default function App() { return <ReactFlowProvider><DnDFlow /></ReactFlowProvider>; }