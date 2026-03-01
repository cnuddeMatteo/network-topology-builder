import React, { useState } from 'react';
import { Cloud, Shield, Router, Network, Monitor, Server, Save, Upload, Image as ImageIcon, Wand2, Plus, Trash2, Eye, FileText, StickyNote } from 'lucide-react';

export default function Sidebar({ onGenerate, onSave, onLoad, onExport, onExportAllCLI }) {
  const [showModal, setShowModal] = useState(false);
  
  const [config, setConfig] = useState({ 
      centralDevice: 'router', 
      generatePCs: true, 
      generateCloudFw: true, 
      generateInfra: true, 
      infraName: 'Siège Social',
      networks: [
          { id: 1, name: 'Profs', type: 'LAN', ip: '192.168.10.0', mask: '24', vlan: '10' },
          { id: 2, name: 'Élèves', type: 'LAN', ip: '192.168.20.0', mask: '24', vlan: '20' },
          { id: 3, name: 'Web', type: 'DMZ', ip: '10.0.0.0', mask: '29', vlan: '99' }
      ]
  });

  const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const addNetwork = () => {
      const newId = config.networks.length > 0 ? Math.max(...config.networks.map(n => n.id)) + 1 : 1;
      setConfig({ ...config, networks: [...config.networks, { id: newId, name: `Réseau ${newId}`, type: 'LAN', ip: '192.168.1.0', mask: '24', vlan: `${newId}0` }] });
  };

  const removeNetwork = (id) => setConfig({ ...config, networks: config.networks.filter(n => n.id !== id) });
  const updateNetwork = (id, field, value) => setConfig({ ...config, networks: config.networks.map(n => n.id === id ? { ...n, [field]: value } : n) });

  const inputStyle = { padding: '8px', backgroundColor: '#111827', color: '#f9fafb', border: '1px solid #374151', borderRadius: '4px', boxSizing: 'border-box', outline: 'none', fontSize: '12px' };
  const toolBtnStyle = { flex: 1, padding: '10px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 'bold' };

  return (
    <aside style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#1f2937', color: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* 🛠️ NOUVEAU BOUTON : EXPORT ALL CLI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <button onClick={onSave} style={toolBtnStyle} title="Sauvegarder (JSON)"><Save size={18} /> Sauver</button>
        <button onClick={() => document.getElementById('file-upload').click()} style={toolBtnStyle} title="Ouvrir (JSON)"><Upload size={18} /> Ouvrir</button>
        <input id="file-upload" type="file" accept=".json" style={{ display: 'none' }} onChange={onLoad} />
        <button onClick={onExport} style={{ ...toolBtnStyle, backgroundColor: '#2563eb' }} title="Exporter Schema (PNG)"><ImageIcon size={18} /> Image</button>
        <button onClick={onExportAllCLI} style={{ ...toolBtnStyle, backgroundColor: '#10b981' }} title="Exporter Configs (TXT)"><FileText size={18} /> Configs CLI</button>
      </div>

      <hr style={{ borderColor: '#374151', margin: '0' }} />

      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#e5e7eb' }}>🛠️ Équipements</h3>
        
        {/* 📝 NOUVEAU : LE POST-IT */}
        <div onDragStart={(e) => onDragStart(e, 'note', 'Nouvelle annotation...')} draggable style={{ padding: '10px', border: 'none', borderRadius: '6px', marginBottom: '15px', cursor: 'grab', backgroundColor: '#fef08a', color: '#1e293b', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)' }}><StickyNote size={18} /> Post-it (Texte)</div>

        <div onDragStart={(e) => onDragStart(e, 'infraBox', 'Zone Infrastructure')} draggable style={{ padding: '10px', border: '2px dashed #9ca3af', borderRadius: '6px', marginBottom: '15px', cursor: 'grab', backgroundColor: '#374151', textAlign: 'center', fontWeight: 'bold' }}>🏢 Zone Infrastructure</div>
        
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Cloud (Internet)')} draggable style={{ padding: '10px', border: '1px dashed #a8a29e', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#44403c', display: 'flex', alignItems: 'center', gap: '10px' }}><Cloud size={18} color="#a8a29e"/> Cloud</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Firewall')} draggable style={{ padding: '10px', border: '1px solid #ef4444', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={18} color="#fca5a5"/> Firewall</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Routeur')} draggable style={{ padding: '10px', border: '1px solid #3b82f6', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px' }}><Router size={18} color="#93c5fd"/> Routeur</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Switch L3')} draggable style={{ padding: '10px', border: '1px solid #8b5cf6', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#4c1d95', display: 'flex', alignItems: 'center', gap: '10px' }}><Network size={18} color="#c4b5fd"/> Switch L3</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Switch')} draggable style={{ padding: '10px', border: '1px solid #22c55e', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#14532d', display: 'flex', alignItems: 'center', gap: '10px' }}><Network size={18} color="#86efac"/> Switch</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Serveur')} draggable style={{ padding: '10px', border: '1px solid #f97316', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#7c2d12', display: 'flex', alignItems: 'center', gap: '10px' }}><Server size={18} color="#fdba74"/> Serveur</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'PC')} draggable style={{ padding: '10px', border: '1px solid #9ca3af', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#374151', display: 'flex', alignItems: 'center', gap: '10px' }}><Monitor size={18} color="#d1d5db"/> PC</div>
      </div>

      <hr style={{ borderColor: '#374151', margin: '10px 0' }} />

      <button onClick={() => setShowModal(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <Wand2 size={18} /> Générateur Magique
      </button>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1f2937', padding: '25px', borderRadius: '12px', border: '1px solid #4b5563', width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 30px rgba(0,0,0,0.6)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Wand2 size={20} color="#8b5cf6"/> Création d'Architecture</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', flexGrow: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{ background: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151', marginBottom: '20px' }}>
                        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Cœur de réseau :</span>
                            <select value={config.centralDevice} onChange={e => setConfig({...config, centralDevice: e.target.value})} style={{...inputStyle, flexGrow: 1, cursor: 'pointer', fontSize: '13px'}}>
                                <option value="router">🌐 Routeur Central</option>
                                <option value="l3switch">🎛️ Switch L3 (Passerelle)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                                <input type="checkbox" checked={config.generateCloudFw} onChange={e => setConfig({...config, generateCloudFw: e.target.checked})} /> ☁️ Cloud & Firewall
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                                <input type="checkbox" checked={config.generatePCs} onChange={e => setConfig({...config, generatePCs: e.target.checked})} /> 💻 Auto-générer PCs/Serveurs
                            </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', flexGrow: 1 }}>
                                <input type="checkbox" checked={config.generateInfra} onChange={e => setConfig({...config, generateInfra: e.target.checked})} /> 🏢 Englober dans une Infra :
                            </label>
                            {config.generateInfra && ( <input type="text" value={config.infraName} onChange={e => setConfig({...config, infraName: e.target.value})} style={{ ...inputStyle, width: '180px', marginBottom: 0 }} placeholder="Nom" /> )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '14px' }}>📋 Sous-Réseaux</h4>
                        <button onClick={addNetwork} style={{ background: '#10b981', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}><Plus size={14} /> Ajouter</button>
                    </div>

                    {config.networks.map((net) => (
                        <div key={net.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#374151', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                            <select value={net.type} onChange={e => updateNetwork(net.id, 'type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer', width: '70px', color: net.type === 'LAN' ? '#4ade80' : '#f97316', fontWeight: 'bold', padding: '8px 5px' }}>
                                <option value="LAN">LAN</option>
                                <option value="DMZ">DMZ</option>
                            </select>
                            <div style={{ flex: 1.2 }}><input value={net.name} onChange={e => updateNetwork(net.id, 'name', e.target.value)} style={{...inputStyle, width: '100%'}} placeholder="Nom" /></div>
                            <div style={{ display: 'flex', alignItems: 'center', flex: 2 }}>
                                <input value={net.ip} onChange={e => updateNetwork(net.id, 'ip', e.target.value)} style={{...inputStyle, width: '100%', borderRadius: '4px 0 0 4px', borderRight: 'none'}} placeholder="IP" />
                                <span style={{ background: '#1f2937', borderTop: '1px solid #374151', borderBottom: '1px solid #374151', padding: '8px 5px', fontSize: '12px', color: '#9ca3af' }}>/</span>
                                <input value={net.mask} onChange={e => updateNetwork(net.id, 'mask', e.target.value)} style={{...inputStyle, width: '40px', borderRadius: '0 4px 4px 0', borderLeft: 'none'}} placeholder="24" />
                            </div>
                            <div style={{ width: '60px' }}><input value={net.vlan} onChange={e => updateNetwork(net.id, 'vlan', e.target.value)} style={{...inputStyle, width: '100%'}} placeholder="VLAN" /></div>
                            <button onClick={() => removeNetwork(net.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Supprimer"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={16}/> Prévisualisation</h4>
                    <pre style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {config.generateInfra && <div style={{ color: '#9ca3af' }}>[🏢 Infra : {config.infraName}]</div>}
                        {config.generateCloudFw && <div>☁️ Internet<br/>│<br/>🧱 Firewall<br/>│</div>}
                        
                        <div style={{ color: config.centralDevice === 'l3switch' ? '#c4b5fd' : '#93c5fd', fontWeight: 'bold' }}>
                            {config.centralDevice === 'l3switch' ? '🎛️ Switch L3 (Passerelle)' : '🌐 Routeur Central'}
                        </div>
                        
                        {config.networks.map((net, idx) => {
                            const isLast = idx === config.networks.length - 1;
                            const branch = isLast ? '└──' : '├──';
                            const space = isLast ? '    ' : '│   ';
                            const icon = net.type === 'LAN' ? '🟢' : '🟠';
                            const endIcon = net.type === 'LAN' ? '💻 2x PC' : '🖥️ 1x Serveur';
                            return (
                                <div key={net.id}>
                                    <div>{branch} {icon} Switch {net.name} <span style={{color: '#64748b'}}>(VLAN {net.vlan})</span></div>
                                    {config.generatePCs && <div>{space} └── {endIcon}</div>}
                                </div>
                            )
                        })}
                    </pre>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #374151' }}>
                <button onClick={() => { onGenerate(config, true); setShowModal(false); }} style={{ width: '100%', padding: '12px', background: '#2563eb', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ Ajouter aux réseaux existants</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                    <button onClick={() => { onGenerate(config, false); setShowModal(false); }} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>⚠️ Remplacer tout</button>
                </div>
            </div>

          </div>
        </div>
      )}
    </aside>
  );
}