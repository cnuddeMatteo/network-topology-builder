import React, { useState } from 'react';
import { Cloud, Shield, Router, Network, Monitor, Server, Save, Upload, Image as ImageIcon, Wand2 } from 'lucide-react';

export default function Sidebar({ onGenerate, onSave, onLoad, onExport }) {
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState({ 
      lans: 'Admin 192.168.10.0/24 10, Utilisateurs 192.168.20.0/24 20', 
      dmzs: 'Web 10.0.0.0/29 99', 
      generatePCs: true, generateCloudFw: true, generateInfra: true, infraName: 'Siège Social'
  });

  const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#111827', color: '#f9fafb', border: '1px solid #374151', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' };
  const toolBtnStyle = { flex: 1, padding: '10px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 'bold' };

  return (
    <aside style={{ width: '100%', height: '100%', padding: '20px', backgroundColor: '#1f2937', color: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button onClick={onSave} style={toolBtnStyle} title="Sauvegarder (JSON)"><Save size={18} /> Sauver</button>
        <button onClick={() => document.getElementById('file-upload').click()} style={toolBtnStyle} title="Ouvrir (JSON)"><Upload size={18} /> Ouvrir</button>
        <input id="file-upload" type="file" accept=".json" style={{ display: 'none' }} onChange={onLoad} />
        <button onClick={onExport} style={{ ...toolBtnStyle, backgroundColor: '#2563eb' }} title="Exporter (PNG)"><ImageIcon size={18} /> Image</button>
      </div>

      <hr style={{ borderColor: '#374151', margin: '0' }} />

      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#e5e7eb' }}>🛠️ Équipements</h3>
        <div onDragStart={(e) => onDragStart(e, 'infraBox', 'Zone Infrastructure')} draggable style={{ padding: '10px', border: '2px dashed #9ca3af', borderRadius: '6px', marginBottom: '15px', cursor: 'grab', backgroundColor: '#374151', textAlign: 'center', fontWeight: 'bold' }}>🏢 Zone Infrastructure</div>
        
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Cloud (Internet)')} draggable style={{ padding: '10px', border: '1px dashed #a8a29e', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#44403c', display: 'flex', alignItems: 'center', gap: '10px' }}><Cloud size={18} color="#a8a29e"/> Cloud</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Firewall')} draggable style={{ padding: '10px', border: '1px solid #ef4444', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={18} color="#fca5a5"/> Firewall</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Routeur')} draggable style={{ padding: '10px', border: '1px solid #3b82f6', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '10px' }}><Router size={18} color="#93c5fd"/> Routeur</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Switch')} draggable style={{ padding: '10px', border: '1px solid #22c55e', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#14532d', display: 'flex', alignItems: 'center', gap: '10px' }}><Network size={18} color="#86efac"/> Switch</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'Serveur')} draggable style={{ padding: '10px', border: '1px solid #f97316', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#7c2d12', display: 'flex', alignItems: 'center', gap: '10px' }}><Server size={18} color="#fdba74"/> Serveur</div>
        <div onDragStart={(e) => onDragStart(e, 'custom', 'PC')} draggable style={{ padding: '10px', border: '1px solid #9ca3af', borderRadius: '6px', marginBottom: '8px', cursor: 'grab', backgroundColor: '#374151', display: 'flex', alignItems: 'center', gap: '10px' }}><Monitor size={18} color="#d1d5db"/> PC</div>
      </div>

      <hr style={{ borderColor: '#374151', margin: '10px 0' }} />

      <button onClick={() => setShowModal(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <Wand2 size={18} /> Générateur Magique
      </button>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1f2937', padding: '25px', borderRadius: '12px', border: '1px solid #4b5563', width: '480px', boxShadow: '0 15px 30px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #374151', paddingBottom: '10px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Wand2 size={20} color="#8b5cf6"/> Configuration Magique</h3>
            
            <div style={{ background: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={config.generateCloudFw} onChange={e => setConfig({...config, generateCloudFw: e.target.checked})} /> ☁️ Inclure Cloud & Firewall
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={config.generatePCs} onChange={e => setConfig({...config, generatePCs: e.target.checked})} /> 💻 Auto-générer PC & Serveurs
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', flexGrow: 1 }}>
                        <input type="checkbox" checked={config.generateInfra} onChange={e => setConfig({...config, generateInfra: e.target.checked})} /> 🏢 Englober dans une Infra
                    </label>
                    {config.generateInfra && ( <input type="text" value={config.infraName} onChange={e => setConfig({...config, infraName: e.target.value})} style={{ ...inputStyle, marginBottom: 0, width: '150px', padding: '5px 10px', fontSize: '12px' }} placeholder="Nom" /> )}
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{fontSize: '12px', color: '#22c55e', fontWeight: 'bold'}}>Réseaux LAN (Nom IP/CIDR VLAN)</span>
                </div>
                <input type="text" value={config.lans} onChange={e => setConfig({...config, lans: e.target.value})} style={inputStyle} placeholder="Ex: Profs 192.168.10.0/24 10" />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{fontSize: '12px', color: '#f97316', fontWeight: 'bold'}}>Zones DMZ (Nom IP/CIDR VLAN)</span>
                </div>
                <input type="text" value={config.dmzs} onChange={e => setConfig({...config, dmzs: e.target.value})} style={inputStyle} placeholder="Ex: Web 10.0.0.0/29 99" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => { onGenerate(config, true); setShowModal(false); }} style={{ width: '100%', padding: '12px', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ Ajouter aux réseaux existants</button>
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