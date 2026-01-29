import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertOctagon, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Terminal, 
  Skull, 
  Flame, 
  Bug, 
  Code, 
  ChevronRight, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { BACKEND_URL } from '../../config';
import { auth } from '../../firebase';

const ChaosButton = ({ title, icon: Icon, onClick, loading, active }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
      active 
        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
        : 'bg-black border-gray-800 text-gray-400 hover:border-red-500/50 hover:text-red-400'
    }`}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
  </button>
);

const BrutalAuditor = () => {
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [chaosLoading, setChaosLoading] = useState(null);
  const [activeChaos, setActiveChaos] = useState(null);
  const terminalRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setTerminalLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const runAudit = async () => {
    setLoading(true);
    setAuditData(null);
    setTerminalLogs([]);
    addLog("Initializing Nexus Brutal Auditor v1.0.4...", "system");
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      addLog("Gathering system diagnostics...", "info");
      addLog("Scanning Firestore collections for anomalies...", "info");
      addLog("Analyzing recent error logs...", "info");
      
      const res = await fetch(`${BACKEND_URL}/api/audit/run`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error("Audit failed");
      
      const data = await res.json();
      
      addLog("Diagnostics received. Feeding data to the Auditor...", "info");
      addLog("Auditor is reviewing your life choices...", "warning");
      
      setTimeout(() => {
        setAuditData(data.report);
        addLog("Audit complete. Prepare for the roast.", "success");
        setLoading(false);
      }, 1500);

    } catch (e) {
      addLog(`CRITICAL ERROR: ${e.message}`, "error");
      setLoading(false);
    }
  };

  const triggerChaos = async (type) => {
    setChaosLoading(type);
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const res = await fetch(`${BACKEND_URL}/api/audit/chaos`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      
      const data = await res.json();
      addLog(`CHAOS TRIGGERED: ${data.message}`, "warning");
      setActiveChaos(type);
      setTimeout(() => setActiveChaos(null), 5000);
    } catch (e) {
      addLog(`CHAOS FAILED: ${e.message}`, "error");
    } finally {
      setChaosLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Main Action */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Skull className="w-32 h-32 text-red-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
              <Flame className="w-6 h-6 text-orange-500" />
              BRUTAL AI AUDITOR
            </h3>
            <p className="text-gray-400 text-sm max-w-md">
              The "Gordon Ramsay" of NexusRBX. This AI will tear your site apart, find every bug, and roast your code until it's perfect.
            </p>
          </div>
          
          <button
            onClick={runAudit}
            disabled={loading}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Skull className="w-6 h-6" />}
            RUN BRUTAL AUDIT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal / Live Feed */}
        <div className="lg:col-span-2 bg-black border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[400px]">
          <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Diagnostic Terminal</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-orange-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>
          </div>
          <div 
            ref={terminalRef}
            className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-800"
          >
            {terminalLogs.length === 0 && (
              <div className="text-gray-700 italic">Waiting for audit initialization...</div>
            )}
            {terminalLogs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-gray-600">[{log.time}]</span>
                <span className={`
                  ${log.type === 'system' ? 'text-purple-400 font-bold' : ''}
                  ${log.type === 'info' ? 'text-cyan-400' : ''}
                  ${log.type === 'warning' ? 'text-orange-400' : ''}
                  ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                  ${log.type === 'success' ? 'text-green-400' : ''}
                `}>
                  {log.msg}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chaos Monkey */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Chaos Monkey
          </h4>
          <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-widest font-bold">Active Stress Testing</p>
          
          <div className="grid grid-cols-1 gap-3">
            <ChaosButton 
              title="Latency Injection" 
              icon={Activity} 
              onClick={() => triggerChaos('latency')}
              loading={chaosLoading === 'latency'}
              active={activeChaos === 'latency'}
            />
            <ChaosButton 
              title="Permission Probe" 
              icon={ShieldCheck} 
              onClick={() => triggerChaos('permissions')}
              loading={chaosLoading === 'permissions'}
              active={activeChaos === 'permissions'}
            />
            <ChaosButton 
              title="UI Stress Test" 
              icon={Bug} 
              onClick={() => triggerChaos('ui_stress')}
              loading={chaosLoading === 'ui_stress'}
              active={activeChaos === 'ui_stress'}
            />
            <ChaosButton 
              title="Data Corruption" 
              icon={RefreshCw} 
              onClick={() => triggerChaos('data_corruption')}
              loading={chaosLoading === 'data_corruption'}
              active={activeChaos === 'data_corruption'}
            />
          </div>
          
          <div className="mt-8 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Warning</p>
            <p className="text-[10px] text-gray-500">Chaos tests simulate real-world failures. Use only in development environments.</p>
          </div>
        </div>
      </div>

      {/* Audit Report */}
      {auditData && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          {/* Brutality Score & Roast */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-black border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-gray-800"
                    strokeDasharray="100, 100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-red-500"
                    strokeDasharray={`${auditData.brutalityScore}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{auditData.brutalityScore}%</span>
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Brutality</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Site Health Score</p>
            </div>
            
            <div className="md:col-span-3 bg-red-500/5 border border-red-500/20 rounded-2xl p-8 relative">
              <div className="absolute top-4 right-4">
                <Skull className="w-8 h-8 text-red-500/20" />
              </div>
              <h4 className="text-red-400 font-black text-xl mb-4 flex items-center gap-2">
                THE ROAST
              </h4>
              <p className="text-gray-300 italic leading-relaxed">
                "{auditData.roast}"
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Critical */}
            <div className="bg-gray-900/50 border border-red-500/30 rounded-2xl p-6">
              <h5 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" /> CRITICAL FAILURES
              </h5>
              <div className="space-y-4">
                {auditData.categories.critical.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-black/40 border border-gray-800">
                    <div className="text-sm font-bold text-white mb-1">{item.issue}</div>
                    <div className="text-xs text-gray-500 mb-3">{item.impact}</div>
                    <div className="p-2 rounded bg-red-500/10 text-[10px] text-red-400 font-mono">
                      FIX: {item.fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ugly */}
            <div className="bg-gray-900/50 border border-orange-500/30 rounded-2xl p-6">
              <h5 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> UGLY CODE
              </h5>
              <div className="space-y-4">
                {auditData.categories.ugly.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-black/40 border border-gray-800">
                    <div className="text-sm font-bold text-white mb-1">{item.issue}</div>
                    <div className="text-xs text-gray-500 mb-3">{item.description}</div>
                    <div className="text-[10px] text-orange-400">
                      SUGGESTION: {item.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mid */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
              <h5 className="text-gray-400 font-bold mb-4 flex items-center gap-2">
                <Skull className="w-4 h-4" /> MID DESIGN
              </h5>
              <div className="space-y-4">
                {auditData.categories.mid.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-black/40 border border-gray-800">
                    <div className="text-sm font-bold text-white mb-1">{item.issue}</div>
                    <div className="text-xs text-gray-500 italic">"{item.roast}"</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Patches */}
          {auditData.patches && auditData.patches.length > 0 && (
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-6">
              <h5 className="text-purple-400 font-bold mb-6 flex items-center gap-2">
                <Code className="w-4 h-4" /> RECOMMENDED PATCHES
              </h5>
              <div className="space-y-6">
                {auditData.patches.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">{p.file}</span>
                      <button className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest">Copy Patch</button>
                    </div>
                    <pre className="p-4 rounded-xl bg-black border border-gray-800 text-[10px] font-mono text-cyan-400 overflow-x-auto">
                      {p.patch}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrutalAuditor;
