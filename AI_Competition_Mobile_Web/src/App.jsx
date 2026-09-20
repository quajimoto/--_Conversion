import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import EvaluationForm from './components/EvaluationForm';
import AdminDashboard from './components/AdminDashboard';
import { API_BASE_URL } from './apiConfig';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('eval_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('eval_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('eval_user');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eval_user');
  };

  const [authMode, setAuthModeState] = useState(() => localStorage.getItem('authMode') || 'LIST');

  const setAuthMode = (mode) => {
    setAuthModeState(mode);
    localStorage.setItem('authMode', mode);
  };
  
  // Manage departments state
  const [departments, setDepartments] = useState([]);

  // Manage evaluation criteria state
  const [criteria, setCriteria] = useState([]);

  useEffect(() => {
    // Fetch departments
    fetch(`${API_BASE_URL}/api/departments`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setDepartments(data);
        else setDepartments(['인사지원팀', '플레이스테이션팀', 'IT기획팀']); // fallback
      })
      .catch(e => {
        console.error(e);
        setDepartments(['인사지원팀', '플레이스테이션팀', 'IT기획팀']);
      });

    // Fetch criteria
    fetch(`${API_BASE_URL}/api/criteria`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setCriteria(data);
        else setCriteria([
          { id: 'c1', label: '실무적용', maxScore: 10, description: '최대 10점' },
          { id: 'c2', label: '업무효율', maxScore: 10, description: '최대 10점' },
          { id: 'c3', label: '창의/혁신성', maxScore: 10, description: '최대 10점' },
          { id: 'c4', label: '확산 가능성', maxScore: 10, description: '최대 10점' }
        ]); // fallback
      })
      .catch(e => console.error(e));

    // Fetch settings
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.authMode) {
          const currentLocal = localStorage.getItem('authMode');
          if (currentLocal !== data.authMode) {
            setAuthModeState(data.authMode);
            localStorage.setItem('authMode', data.authMode);
          }
        }
      })
      .catch(e => console.error(e));
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          user ? (
            <Navigate to="/evaluation" replace />
          ) : (
            <Login onLogin={handleLogin} authMode={authMode} />
          )
        } />
        <Route path="/evaluation" element={
          user ? (
            <EvaluationForm user={user} onLogout={handleLogout} departments={departments} criteria={criteria} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        <Route path="/admin" element={
          user?.role === 'ADMIN' ? (
            <AdminDashboard user={user} onLogout={handleLogout} departments={departments} setDepartments={setDepartments} criteria={criteria} setCriteria={setCriteria} authMode={authMode} setAuthMode={setAuthMode} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
