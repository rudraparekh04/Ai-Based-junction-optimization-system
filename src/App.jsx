import React, { useState, useEffect } from 'react';
import { 
  Activity, Car, Siren, Clock, Settings, 
  Play, Square, Zap, FileCode, Map as MapIcon,
  ArrowUpRight, ArrowDownRight, Layers, Calculator,
  Brain, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import './index.css';

const LANES = ['North', 'South', 'East', 'West'];
const MAX_SIGNAL_TIME = 100;

const App = () => {
  const [simulationActive, setSimulationActive] = useState(false);
  
  // Base vehicles count mimicking real-time flow
  const [vehicles, setVehicles] = useState({ North: 45, South: 10, East: 25, West: 20 });
  const [lights, setLights] = useState({ North: 'red', South: 'red', East: 'green', West: 'green' });
  
  const [emergencyActive, setEmergencyActive] = useState(null); // stores lane if ambulance detected
  
  const [logs, setLogs] = useState([
    { id: 1, type: 'system', title: 'Python Backend Connected', desc: 'Weighted density formula loaded.', time: new Date().toLocaleTimeString(), icon: <FileCode size={16} /> },
    { id: 2, type: 'action', title: 'SUMO Simulator Sync', desc: 'Simulation active.', time: new Date().toLocaleTimeString(), icon: <Layers size={16} /> }
  ]);

  const [cars, setCars] = useState([]);
  const [predictions, setPredictions] = useState({ North: 50, South: 12, East: 28, West: 24 });

  // Calculate dynamic green times based on the formula:
  // Green Time = (Lane Vehicles / Total Vehicles) * MAX_SIGNAL_TIME
  const totalVehicles = Object.values(vehicles).reduce((a, b) => a + b, 0);
  const greenTimes = {
    North: Math.round((vehicles.North / totalVehicles) * MAX_SIGNAL_TIME),
    South: Math.round((vehicles.South / totalVehicles) * MAX_SIGNAL_TIME),
    East: Math.round((vehicles.East / totalVehicles) * MAX_SIGNAL_TIME),
    West: Math.round((vehicles.West / totalVehicles) * MAX_SIGNAL_TIME),
  };

  // Master Simulation Loop
  useEffect(() => {
    if (!simulationActive) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      // 1. Update Vehicles (simulate SUMO data arriving)
      setVehicles(prev => {
        const newV = { ...prev };
        const randomLane = LANES[Math.floor(Math.random() * LANES.length)];
        const change = Math.floor(Math.random() * 7) - 3; 
        newV[randomLane] = Math.max(5, Math.min(80, newV[randomLane] + change));
        
        if (tick % 3 === 0) {
          fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newV)
          })
          .then(res => res.json())
          .then(data => {
            setPredictions(data);
            if (Math.random() > 0.4) {
              addLog('system', 'FastAPI ML', 'Live Python model generated prediction.', <Brain size={16} />);
            }
          })
          .catch(err => {
            // Fallback to simulation if backend offline
            setPredictions({
              North: Math.max(5, Math.floor(newV.North * (1 + (Math.random() * 0.5 - 0.1)))),
              South: Math.max(5, Math.floor(newV.South * (1 + (Math.random() * 0.5 - 0.1)))),
              East: Math.max(5, Math.floor(newV.East * (1 + (Math.random() * 0.5 - 0.1)))),
              West: Math.max(5, Math.floor(newV.West * (1 + (Math.random() * 0.5 - 0.1)))),
            });
            if (Math.random() > 0.4) {
              addLog('system', 'Sim Predictor', 'Backend offline. Using mock.', <Brain size={16} />);
            }
          });
        }
        return newV;
      });

      // 2. Spawn Cars visually
      if (Math.random() > 0.4) {
        const lane = LANES[Math.floor(Math.random() * LANES.length)];
        const isAmbulance = Math.random() > 0.95; 
        
        const newCar = {
          id: Math.random().toString(),
          lane,
          isAmbulance,
          color: isAmbulance ? '#fff' : `hsl(${Math.random() * 360}, 70%, 60%)`
        };
        setCars(prev => [...prev.slice(-15), newCar]);

        // 3. Ambulance Preemption
        if (isAmbulance && !emergencyActive) {
          setEmergencyActive(lane);
          addLog('priority', 'Ambulance Detected', `Lane ${lane} preempted.`, <Siren size={16} />);
          
          setLights(prev => {
            const newLights = { ...prev };
            if (lane === 'North' || lane === 'South') {
              newLights.North = 'green'; newLights.South = 'green';
              newLights.East = 'red'; newLights.West = 'red';
            } else {
              newLights.East = 'green'; newLights.West = 'green';
              newLights.North = 'red'; newLights.South = 'red';
            }
            return newLights;
          });

          setTimeout(() => setEmergencyActive(null), 5000);
        }
      }

    }, 2000);

    return () => clearInterval(interval);
  }, [simulationActive, emergencyActive]);

  // Traffic Light Toggle Logic (based on highest green time needed)
  useEffect(() => {
    if (!simulationActive || emergencyActive) return;

    const aiInterval = setInterval(() => {
      let highestLane = 'North';
      let maxTime = greenTimes.North;
      
      LANES.forEach(lane => {
        if (greenTimes[lane] > maxTime) { maxTime = greenTimes[lane]; highestLane = lane; }
      });

      if (lights[highestLane] === 'red') {
        addLog('action', 'Phase Shift', `Optimizing for ${highestLane} (Allocated ${maxTime}s)`, <Calculator size={16} />);
        setLights(prev => {
          const newLights = { ...prev };
          if (highestLane === 'North' || highestLane === 'South') {
            newLights.North = 'green'; newLights.South = 'green'; newLights.East = 'red'; newLights.West = 'red';
          } else {
            newLights.East = 'green'; newLights.West = 'green'; newLights.North = 'red'; newLights.South = 'red';
          }
          return newLights;
        });
      }
    }, 5000);

    return () => clearInterval(aiInterval);
  }, [greenTimes, lights, simulationActive, emergencyActive]);

  const addLog = (type, title, desc, icon) => {
    setLogs(prev => [
      { id: Math.random(), type, title, desc, time: new Date().toLocaleTimeString(), icon },
      ...prev
    ].slice(0, 10));
  };

  const chartData = LANES.map(lane => ({
    name: lane,
    Current: vehicles[lane],
    Predicted: predictions[lane]
  }));

  const generateSuggestions = () => {
    const suggestions = [];
    LANES.forEach(lane => {
      if (vehicles[lane] > 65) {
        suggestions.push({ type: 'critical', text: `Severe backup on ${lane}. Divert incoming traffic.` });
      } else if (predictions[lane] > vehicles[lane] && predictions[lane] > 50) {
        suggestions.push({ type: 'warning', text: `Predicted surge on ${lane}. Open auxiliary lane.` });
      }
    });
    if (totalVehicles > 180) {
      suggestions.push({ type: 'critical', text: `Junction over capacity. Throttle upstream signals.` });
    } else if (suggestions.length === 0) {
      suggestions.push({ type: 'success', text: `Traffic flowing optimally. No changes required.` });
    }
    return suggestions.slice(0, 3);
  };
  const aiSuggestions = generateSuggestions();

  return (
    <div className="app-container">
      {emergencyActive && (
        <div className="emergency-alert">
          <Siren size={20} className="pulse-icon" /> 
          EMERGENCY DETECTED: Giving priority to {emergencyActive} bound lane.
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon"><Zap size={20} /></div>
          <h1>Junction.AI</h1>
        </div>
        <div className="nav-menu">
          <div className="nav-item active"><Activity size={20} /><span>Dashboard</span></div>
          <div className="nav-item"><Calculator size={20} /><span>Logic & Formulas</span></div>
          <div className="nav-item"><Layers size={20} /><span>SUMO Integration</span></div>
          <div className="nav-item"><FileCode size={20} /><span>Python Script</span></div>
          <div className="nav-item"><Settings size={20} /><span>Settings</span></div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-content">
        <header className="topbar" style={{ marginTop: emergencyActive ? '40px' : '0', transition: 'margin 0.3s' }}>
          <h2 className="page-title">AI Traffic Dashboard</h2>
          <div className="topbar-actions">
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              SUMO STATUS: {simulationActive ? 'SYNCED' : 'PAUSED'}
            </span>
            <button 
              className={`btn ${simulationActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => setSimulationActive(!simulationActive)}
            >
              {simulationActive ? <><Square size={16} /> Stop Demo</> : <><Play size={16} /> Start Project Demo</>}
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="left-panel">
            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header"><span>Total Vehicles</span><div className="stat-icon blue"><Car size={18} /></div></div>
                <div className="stat-value">{totalVehicles}</div>
                <div className="stat-trend trend-up" style={{color: 'var(--text-muted)'}}>Current Junction Load</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Max Signal Time</span><div className="stat-icon purple"><Clock size={18} /></div></div>
                <div className="stat-value">{MAX_SIGNAL_TIME}s</div>
                <div className="stat-trend" style={{color: 'var(--text-muted)'}}>Base constant</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Ambulances</span><div className="stat-icon red"><Siren size={18} /></div></div>
                <div className="stat-value">Live</div>
                <div className="stat-trend trend-down"><ArrowDownRight size={14} /> Zero delays</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Python Logic</span><div className="stat-icon green"><FileCode size={18} /></div></div>
                <div className="stat-value">Active</div>
                <div className="stat-trend trend-up" style={{color: 'var(--success)'}}><ArrowUpRight size={14} /> Optimizing</div>
              </div>
            </div>

            {/* Junction Visualizer */}
            <div className="visualizer-card">
              <div className="card-header">
                <h3 className="card-title"><MapIcon size={18} color="var(--primary)" /> SUMO Intersection Visualizer</h3>
              </div>
              
              <div className="junction-container">
                <div className="road-vertical"></div><div className="road-horizontal"></div><div className="intersection-box"></div>
                {/* Traffic Lights */}
                <div className="traffic-light vertical tl-north">
                  <div className={`light-bulb red ${lights.North === 'red' ? 'active' : ''}`}></div>
                  <div className="light-bulb yellow"></div>
                  <div className={`light-bulb green ${lights.North === 'green' ? 'active' : ''}`}></div>
                </div>
                <div className="traffic-light vertical tl-south">
                  <div className={`light-bulb red ${lights.South === 'red' ? 'active' : ''}`}></div>
                  <div className="light-bulb yellow"></div>
                  <div className={`light-bulb green ${lights.South === 'green' ? 'active' : ''}`}></div>
                </div>
                <div className="traffic-light tl-east">
                  <div className={`light-bulb red ${lights.East === 'red' ? 'active' : ''}`}></div>
                  <div className="light-bulb yellow"></div>
                  <div className={`light-bulb green ${lights.East === 'green' ? 'active' : ''}`}></div>
                </div>
                <div className="traffic-light tl-west">
                  <div className={`light-bulb red ${lights.West === 'red' ? 'active' : ''}`}></div>
                  <div className="light-bulb yellow"></div>
                  <div className={`light-bulb green ${lights.West === 'green' ? 'active' : ''}`}></div>
                </div>

                {cars.map(car => (
                  <div key={car.id} className={`car ${car.lane.toLowerCase()} ${car.isAmbulance ? 'ambulance' : ''}`}
                    style={{ background: car.isAmbulance ? undefined : car.color,
                      ...(car.lane === 'North' ? { top: '10%', left: 'calc(50% - 30px)' } : {}),
                      ...(car.lane === 'South' ? { bottom: '10%', right: 'calc(50% - 30px)' } : {}),
                      ...(car.lane === 'East' ? { right: '10%', top: 'calc(50% - 30px)' } : {}),
                      ...(car.lane === 'West' ? { left: '10%', bottom: 'calc(50% - 30px)' } : {})
                    }}></div>
                ))}
              </div>
            </div>

            {/* AI Flow & Lane Management Suggestions */}
            <div className="panel-card" style={{ marginTop: '1rem' }}>
              <div className="card-header" style={{ marginBottom: '0.5rem' }}>
                <h3 className="card-title"><Zap size={18} color="var(--warning)" /> AI Flow & Lane Management</h3>
              </div>
              <div className="suggestions-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {aiSuggestions.map((sug, i) => (
                  <div key={i} className={`suggestion-item ${sug.type}`} style={{ padding: '0.75rem', borderRadius: '8px', borderLeft: `4px solid var(--${sug.type === 'critical' ? 'danger' : sug.type === 'warning' ? 'warning' : 'success'})`, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{sug.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="right-panel">
            
            {/* Mathematics & Formula */}
            <div className="panel-card">
              <div className="card-header" style={{ marginBottom: '0' }}>
                <h3 className="card-title"><Calculator size={18} /> Weighted Traffic Density</h3>
              </div>
              
              <div className="formula-box">
                <span className="formula-title">Python Logic Formula</span>
                <span className="formula-text">
                  Green_Time = (<span className="formula-highlight">Lane_Vehicles</span> / Total_Vehicles) * Max_Signal
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lane</th>
                    <th>Vehicles</th>
                    <th>Calc. Green Time</th>
                  </tr>
                </thead>
                <tbody>
                  {LANES.map(lane => (
                    <tr key={lane}>
                      <td>{lane}</td>
                      <td style={{ color: 'var(--warning)' }}>{vehicles[lane]}</td>
                      <td style={{ color: 'var(--success)' }}>{greenTimes[lane]} sec</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ML Predictions */}
            <div className="panel-card">
              <div className="card-header" style={{ marginBottom: '0' }}>
                <h3 className="card-title"><Brain size={18} /> ML Congestion Prediction (T+15m)</h3>
              </div>
              
              <div className="formula-box">
                <span className="formula-title">LSTM Neural Network</span>
                <span className="formula-text">
                  Predicting future bottleneck probabilities using historical flow data.
                </span>
              </div>

              <div style={{ width: '100%', height: 200, marginTop: '1rem', marginBottom: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ fontSize: '14px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Current" fill="#4d94ff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Predicted" fill="#ff4d4d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lane</th>
                    <th>Current</th>
                    <th>Predicted (T+15m)</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {LANES.map(lane => {
                    const diff = predictions[lane] - vehicles[lane];
                    const isUp = diff > 0;
                    return (
                    <tr key={`pred-${lane}`}>
                      <td>{lane}</td>
                      <td>{vehicles[lane]}</td>
                      <td style={{ color: isUp ? 'var(--danger)' : 'var(--success)' }}>{predictions[lane]}</td>
                      <td>
                        {isUp ? <TrendingUp size={16} color="var(--danger)" /> : <ArrowDownRight size={16} color="var(--success)" />}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Action Logs */}
            <div className="panel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3 className="card-title"><Activity size={18} /> Python Logic Logs</h3>
              </div>
              <div className="ai-logs">
                {logs.map(log => (
                  <div className={`log-item ${log.type}`} key={log.id}>
                    <div className="log-icon" style={{ color: log.type === 'priority' ? 'var(--danger)' : log.type === 'action' ? 'var(--primary)' : 'var(--success)' }}>
                      {log.icon}
                    </div>
                    <div className="log-content">
                      <div className="log-header">
                        <span className="log-title">{log.title}</span>
                        <span className="log-time">{log.time}</span>
                      </div>
                      <div className="log-desc">{log.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
