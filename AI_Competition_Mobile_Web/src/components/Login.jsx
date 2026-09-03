import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

const Login = ({ onLogin, authMode }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [inputName, setInputName] = useState('');

  const handleSimpleLogin = (e) => {
    e.preventDefault();
    if (selectedUser) {
      // Mock logic: if user is 'admin', set role ADMIN
      const role = selectedUser.toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
      onLogin({ name: selectedUser, role });
    } else {
      alert('이름을 선택해주세요.');
    }
  };

  const handleSecureLogin = async (e) => {
    e.preventDefault();
    if (empId && password) {
      try {
        const res = await fetch('http://101.79.29.163:3001/api/login', {
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

  const handleNameLogin = (e) => {
    e.preventDefault();
    if (inputName) {
      const role = inputName.toLowerCase() === 'admin' ? 'ADMIN' : 'USER';
      onLogin({ name: inputName, role });
    } else {
      alert('이름을 입력해주세요.');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="headline-md" style={{ color: 'var(--primary)' }}>사내 경진대회</h1>
          <p className="body-md" style={{ color: 'var(--text-sub)' }}>평가 및 집계 시스템</p>
        </div>

        {authMode === 'LIST' && (
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
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <LogIn size={18} />
              입장하기
            </button>
          </form>
        )}
        
        {authMode === 'ID_PW' && (
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
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <LogIn size={18} />
              로그인
            </button>
          </form>
        )}
        
        {authMode === 'NAME' && (
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
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <LogIn size={18} />
              입장하기
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
