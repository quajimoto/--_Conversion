import React, { useState } from 'react';
import { LogIn, UserCheck, Shield, Key } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const Login = ({ onLogin, authMode }) => {
  const currentMode = authMode || localStorage.getItem('authMode') || 'ANONYMOUS';
  const [selectedUser, setSelectedUser] = useState('');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');

  // 1. Anonymous Login (무기명 접속: 클릭 순서대로 평가자 1, 평가자 2, ...)
  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    try {
      let evaluatorName = null;
      
      // 1-1. 전용 백엔드 엔드포인트 호출 시도
      try {
        const res = await fetch(`${API_BASE_URL}/api/anonymous-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.user?.name) {
            evaluatorName = data.user.name;
          }
        }
      } catch (endpointErr) {
        console.warn('Dedicated endpoint failed, trying fallback:', endpointErr);
      }

      // 1-2. 백엔드가 아직 구버전이거나 404일 경우 settings & 기존 평가결과 기반 자동 순번 계산 (폴백)
      if (!evaluatorName) {
        const [settingsData, resultsData] = await Promise.all([
          fetch(`${API_BASE_URL}/api/settings`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetch(`${API_BASE_URL}/api/admin/results`).then(r => r.ok ? r.json() : {}).catch(() => ({}))
        ]);

        let counter = parseInt(settingsData?.anonymous_counter || '0', 10);
        if (isNaN(counter) || counter < 0) counter = 0;

        let maxNum = 0;
        if (resultsData?.results && Array.isArray(resultsData.results)) {
          for (const item of resultsData.results) {
            const match = (item.name || '').match(/^평가자\s*(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }

        const nextNum = Math.max(counter, maxNum) + 1;
        evaluatorName = `평가자 ${nextNum}`;

        // settings 테이블에 새 번호 즉시 반영
        await fetch(`${API_BASE_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonymous_counter: String(nextNum) })
        }).catch(err => console.error('Failed to sync anonymous_counter:', err));
      }

      onLogin({ name: evaluatorName, role: 'USER', isAnonymous: true });
    } catch (err) {
      console.error(err);
      alert('서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Simple List Login
  const handleSimpleLogin = (e) => {
    e.preventDefault();
    if (selectedUser) {
      const role = selectedUser.toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
      onLogin({ name: selectedUser, role });
    } else {
      alert('이름을 선택해주세요.');
    }
  };

  // 3. ID/PW Secure Login
  const handleSecureLogin = async (e) => {
    e.preventDefault();
    if (empId && password) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empId, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          onLogin({ name: data.user.name, role: data.user.role });
        } else {
          alert('로그인이 실패했습니다.\n다시 로그인하세요.');
        }
      } catch (err) {
        console.error(err);
        alert('서버와 통신할 수 없습니다.');
      }
    } else {
      alert('사번과 비밀번호를 입력해주세요.');
    }
  };

  // 4. Name Direct Input Login
  const handleNameLogin = (e) => {
    e.preventDefault();
    if (inputName) {
      const role = inputName.toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
      onLogin({ name: inputName, role });
    } else {
      alert('이름을 입력해주세요.');
    }
  };

  // 5. Admin Direct Login (보조 관리자 로그인 폼)
  const handleAdminDirectLogin = async (e) => {
    e.preventDefault();
    if (!adminId || !adminPw) {
      alert('관리자 ID와 비밀번호를 입력해주세요.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: adminId, password: adminPw })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user.role === 'ADMIN') {
        onLogin({ name: data.user.name, role: 'ADMIN' });
      } else {
        alert('관리자 인증에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버와 통신할 수 없습니다.');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px 16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '6px' }}>사내 경진대회</h1>
          <p className="body-md" style={{ color: 'var(--text-sub)' }}>평가 및 집계 시스템</p>
        </div>

        {/* 1. ANONYMOUS Mode (무기명 모드가 기본이거나 활성화된 경우) */}
        {currentMode === 'ANONYMOUS' && !showAdminLogin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              backgroundColor: 'var(--surface-container-low, #f0f4f9)', 
              borderRadius: '8px', 
              padding: '16px', 
              textAlign: 'center',
              border: '1px solid var(--surface-border)'
            }}>
              <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-container, #e3f2fd)', color: 'var(--primary)', marginBottom: '8px' }}>
                <UserCheck size={28} color="var(--primary)" />
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>
                무기명 평가 모드
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.5' }}>
                버튼을 클릭하면 접속 순서에 따라<br />
                <strong>평가자 순번(평가자 1, 평가자 2...)</strong>이 자동 부여됩니다.
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                borderRadius: '8px'
              }}
              onClick={handleAnonymousLogin}
              disabled={isLoading}
            >
              <UserCheck size={20} />
              {isLoading ? '접속 처리 중...' : '무기명 접속 (평가 시작)'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-sub)', 
                  fontSize: '12px', 
                  cursor: 'pointer', 
                  textDecoration: 'underline' 
                }}
              >
                관리자(Admin) 로그인
              </button>
            </div>
          </div>
        )}

        {/* 2. LIST Mode (이름 선택) */}
        {currentMode === 'LIST' && !showAdminLogin && (
          <form onSubmit={handleSimpleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가자 이름 선택</label>
              <select 
                className="input-field" 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">이름을 선택하세요</option>
                <option value="홍길동">홍길동</option>
                <option value="김철수">김철수</option>
                <option value="admin">관리자(Admin)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
              <LogIn size={18} />
              입장하기
            </button>

            {/* Quick Anonymous Access Button */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>또는</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }}
              onClick={handleAnonymousLogin}
              disabled={isLoading}
            >
              <UserCheck size={16} />
              {isLoading ? '접속 중...' : '무기명 접속'}
            </button>
          </form>
        )}
        
        {/* 3. ID/PW Mode (사번/비밀번호) */}
        {currentMode === 'ID_PW' && !showAdminLogin && (
          <form onSubmit={handleSecureLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>사번</label>
              <input 
                type="text" 
                className="input-field" 
                value={empId} 
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="사번을 입력하세요"
              />
            </div>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>비밀번호</label>
              <input 
                type="password" 
                className="input-field" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
              <LogIn size={18} />
              로그인
            </button>

            {/* Quick Anonymous Access Button */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>또는</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }}
              onClick={handleAnonymousLogin}
              disabled={isLoading}
            >
              <UserCheck size={16} />
              {isLoading ? '접속 중...' : '무기명 접속'}
            </button>
          </form>
        )}
        
        {/* 4. NAME Mode (이름 직접 입력) */}
        {currentMode === 'NAME' && !showAdminLogin && (
          <form onSubmit={handleNameLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>본인 이름 직접 입력</label>
              <input 
                type="text" 
                className="input-field" 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
              <LogIn size={18} />
              입장하기
            </button>

            {/* Quick Anonymous Access Button */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>또는</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--surface-border)' }} />
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }}
              onClick={handleAnonymousLogin}
              disabled={isLoading}
            >
              <UserCheck size={16} />
              {isLoading ? '접속 중...' : '무기명 접속'}
            </button>
          </form>
        )}

        {/* 5. Fallback Admin Login Form (모든 모드에서 관리자 진입 지원) */}
        {showAdminLogin && (
          <form onSubmit={handleAdminDirectLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '4px' }}>
              <Shield size={18} /> 관리자 인증
            </div>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '6px' }}>관리자 ID</label>
              <input 
                type="text" 
                className="input-field" 
                value={adminId} 
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '6px' }}>비밀번호</label>
              <input 
                type="password" 
                className="input-field" 
                value={adminPw} 
                onChange={(e) => setAdminPw(e.target.value)}
                placeholder="비밀번호"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
              <Key size={16} /> 관리자 로그인
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setShowAdminLogin(false)}
            >
              이전 화면으로
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
