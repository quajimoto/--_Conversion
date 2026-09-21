import React, { useState, useEffect } from 'react';
import { BarChart3, LogOut, ArrowLeft, Users, Plus, Trash2, Edit2, Save, GripVertical, Download, Settings, RefreshCw, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../apiConfig';

const AdminDashboard = ({ user, onLogout, departments, setDepartments, criteria, setCriteria, authMode, setAuthMode }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('RESULTS');
  const [summaryMode, setSummaryMode] = useState('DETAIL');
  const [date, setDate] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  });
  const [selectedDept, setSelectedDept] = useState('전체');
  
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const [results, setResults] = useState([]);
  const [checkedResults, setCheckedResults] = useState([]);
  const [averages, setAverages] = useState({ total: 0 });

  const [newDept, setNewDept] = useState('');
  const [editDeptOld, setEditDeptOld] = useState('');
  const [editDeptNew, setEditDeptNew] = useState('');

  const [selectedAuthMode, setSelectedAuthMode] = useState(authMode || 'ANONYMOUS');
  const [anonCounter, setAnonCounter] = useState(0);

  const fetchAnonCounter = () => {
    fetch(`${API_BASE_URL}/api/anonymous-counter`)
      .then(res => res.json())
      .then(data => {
        if (data && data.counter !== undefined) setAnonCounter(data.counter);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchAnonCounter();
  }, []);

  const handleResetAnonCounter = async () => {
    if (!window.confirm('무기명 평가자 순번을 0으로 초기화하시겠습니까?\n다음 접속자부터 [평가자 1]로 새로 부여됩니다.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/anonymous-counter/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startValue: 0 })
      });
      if (res.ok) {
        setAnonCounter(0);
        alert('무기명 순번이 0으로 초기화되었습니다.\n다음 접속자는 [평가자 1]로 발급됩니다.');
      }
    } catch(e) {
      console.error(e);
      alert('초기화 실패');
    }
  };

  useEffect(() => {
    if (authMode) setSelectedAuthMode(authMode);
  }, [authMode]);

  const handleFetchResults = async (deptToFetch = selectedDept) => {
    try {
      const target = deptToFetch || '전체';
      const res = await fetch(`${API_BASE_URL}/api/admin/results?department=${encodeURIComponent(target)}&date=${date}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        setAverages(data.averages || { total: 0 });
        setCheckedResults([]);
      }
    } catch (e) {
      console.error(e);
      alert('데이터를 가져오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    handleFetchResults(selectedDept);
  }, [selectedDept, date]);

  const handleAddDepartment = () => {
    if (!newDept) return;
    if (departments.includes(newDept)) {
      alert('이미 존재하는 부서입니다.');
      return;
    }
    setDepartments([...departments, newDept]);
    setNewDept('');
  };

  const handleDeleteDepartment = (dept) => {
    if (confirm(`'${dept}' 부서를 삭제하시겠습니까?`)) {
      setDepartments(departments.filter(d => d !== dept));
      if (selectedDept === dept) {
        setSelectedDept(departments.find(d => d !== dept) || '');
      }
    }
  };

  const handleEditClick = (dept) => {
    setEditDeptOld(dept);
    setEditDeptNew(dept);
  };

  const handleEditSave = () => {
    if (!editDeptNew) return;
    if (editDeptNew !== editDeptOld && departments.includes(editDeptNew)) {
      alert('이미 존재하는 부서명입니다.');
      return;
    }
    setDepartments(departments.map(d => d === editDeptOld ? editDeptNew : d));
    if (selectedDept === editDeptOld) {
      setSelectedDept(editDeptNew);
    }
    setEditDeptOld('');
    setEditDeptNew('');
  };

  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragEnter = (index) => {
    setDragOverItemIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
      const newDeps = [...departments];
      const draggedItem = newDeps.splice(draggedItemIndex, 1)[0];
      newDeps.splice(dragOverItemIndex, 0, draggedItem);
      setDepartments(newDeps);
    }
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const handleAddCriterion = () => {
    const newId = `criterion_${Date.now()}`;
    setCriteria([...criteria, { id: newId, label: '새 항목', maxScore: 10, description: '최대 10점' }]);
  };

  const handleDeleteCriterion = (id) => {
    if (confirm('평가 항목을 삭제하시겠습니까?')) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleSyncDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/departments/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments })
      });
      if (res.ok) alert('부서 설정이 데이터베이스에 안전하게 최종 저장되었습니다.');
      else alert('저장에 실패했습니다.');
    } catch(e) {
      console.error(e);
      alert('서버 연결 실패');
    }
  };

  const handleSyncCriteria = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/criteria/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria })
      });
      if (res.ok) alert('평가 항목 설정이 데이터베이스에 안전하게 최종 저장되었습니다.');
      else alert('저장에 실패했습니다.');
    } catch(e) {
      console.error(e);
      alert('서버 연결 실패');
    }
  };

  const getAggregatedResults = (groupBy) => {
    const map = {};
    results.filter(r => !r.isDeleted).forEach(r => {
      const key = r[groupBy] || (groupBy === 'department_name' ? '부서 미지정' : '알 수 없음');
      if(!map[key]) map[key] = { count: 0, totalScore: 0, criteria: {} };
      map[key].count++;
      map[key].totalScore += r.total;
      criteria?.forEach(c => {
         map[key].criteria[c.id] = (map[key].criteria[c.id] || 0) + (r[c.id] || 0);
      });
    });
    return Object.keys(map).map(key => {
      const data = map[key];
      const avgTotal = (data.totalScore / data.count).toFixed(1);
      const avgCriteria = {};
      criteria?.forEach(c => {
        avgCriteria[c.id] = (data.criteria[c.id] / data.count).toFixed(1);
      });
      const formattedTotalScore = Number.isInteger(data.totalScore) ? data.totalScore : Number(data.totalScore.toFixed(1));
      return { key, count: data.count, totalScore: formattedTotalScore, avgTotal, avgCriteria };
    }).sort((a,b) => b.avgTotal - a.avgTotal);
  };

  const handleDownloadExcel = () => {
    const criteriaLabels = criteria.map(c => c.label);
    const emptyColsForCriteria = Array(criteriaLabels.length > 0 ? criteriaLabels.length - 1 : 0).fill('');
    
    const headerRow1 = ['평가 날짜', '심사위원', '부서', '평가항목', ...emptyColsForCriteria, '총점'];
    const headerRow2 = ['', '', '', ...criteriaLabels, ''];
    
    const rows = results.map(r => {
      const scores = criteria.map(c => r[c.id] || 0);
      let evalDate = '';
      try { evalDate = new Date(r.date).toISOString().split('T')[0]; } catch(e) { evalDate = r.date; }
      return [evalDate, r.name, r.department_name || selectedDept || '전체', ...scores, r.total];
    });

    const wsData = [headerRow1, headerRow2, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    ];
    
    if (criteriaLabels.length > 0) {
      merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + criteriaLabels.length - 1 } });
      merges.push({ s: { r: 0, c: 3 + criteriaLabels.length }, e: { r: 1, c: 3 + criteriaLabels.length } });
    } else {
      merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
    }
    
    ws['!merges'] = merges;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "평가결과");
    XLSX.writeFile(wb, `평가결과_${date}_${selectedDept || '전체'}.xlsx`);
  };

  const handleDownloadAllExcel = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/results?department=전체&date=${date}`);
      const data = await res.json();
      if (data.results) {
        const criteriaLabels = criteria.map(c => c.label);
        const emptyColsForCriteria = Array(criteriaLabels.length > 0 ? criteriaLabels.length - 1 : 0).fill('');
        
        const headerRow1 = ['평가 날짜', '심사위원', '부서', '평가항목', ...emptyColsForCriteria, '총점'];
        const headerRow2 = ['', '', '', ...criteriaLabels, ''];
        
        const rows = data.results.map(r => {
          const scores = criteria.map(c => r[c.id] || 0);
          let evalDate = '';
          try { evalDate = new Date(r.date).toISOString().split('T')[0]; } catch(e) { evalDate = r.date; }
          return [evalDate, r.name, r.department_name || '부서', ...scores, r.total];
        });

        const wsData = [headerRow1, headerRow2, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        const merges = [
          { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
          { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
          { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
        ];
        
        if (criteriaLabels.length > 0) {
          merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + criteriaLabels.length - 1 } });
          merges.push({ s: { r: 0, c: 3 + criteriaLabels.length }, e: { r: 1, c: 3 + criteriaLabels.length } });
        } else {
          merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
        }
        
        ws['!merges'] = merges;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "전체결과");
        XLSX.writeFile(wb, `전체_평가결과_${date}.xlsx`);
      }
    } catch (e) {
      console.error(e);
      alert('전체 데이터를 불러오는데 실패했습니다.');
    }
  };

  const handleDeleteSelected = async () => {
    if (checkedResults.length === 0) {
      alert('삭제할 항목을 먼저 체크박스로 선택해주세요.');
      return;
    }
    if (confirm(`선택하신 ${checkedResults.length}건의 평가 이력을 삭제하시겠습니까?\n(데이터베이스에는 삭제 상태로 안전하게 보관됩니다)`)) {
      try {
        const idsToDelete = checkedResults.map(index => results[index].id);
        const res = await fetch(`${API_BASE_URL}/api/admin/results/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToDelete })
        });
        if (res.ok) {
          alert('성공적으로 삭제되었습니다.');
          handleFetchResults();
        } else {
          alert('삭제 처리에 실패했습니다.');
        }
      } catch (e) {
        console.error(e);
        alert('서버 오류로 삭제에 실패했습니다.');
      }
    }
  };

  const handleSaveAndRedirectLogin = async (targetMode) => {
    const modeToSave = targetMode || selectedAuthMode || authMode || 'LIST';
    
    // 1. Synchronously set localStorage and React state
    localStorage.setItem('authMode', modeToSave);
    if (setAuthMode) setAuthMode(modeToSave);
    
    // 2. Await API sync to ensure database is updated BEFORE browser navigates!
    try {
      await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authMode: modeToSave }),
        keepalive: true
      });
    } catch(err) {
      console.error('API Sync Error:', err);
    }

    // 3. Logout and redirect to main login page
    if (onLogout) onLogout();
    window.location.href = '/';
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <header style={{ backgroundColor: 'var(--surface-header)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate('/evaluation')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} color="var(--primary)" /></button>
          <h2 className="title-md">관리자 메뉴</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="input-field" 
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', border: 'none', backgroundColor: 'var(--surface-container-low)', fontWeight: 'bold' }}
            value={selectedAuthMode} 
            onChange={(e) => setSelectedAuthMode(e.target.value)}
          >
            <option value="ANONYMOUS">무기명 접속 방식</option>
            <option value="NAME">이름 직접입력 방식</option>
            <option value="LIST">리스트 선택 방식</option>
            <option value="ID_PW">사번/비밀번호 방식</option>
          </select>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '12px', minHeight: '32px', height: 'auto', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={() => handleSaveAndRedirectLogin(selectedAuthMode)}
          >
            저장
          </button>
          <span className="label-md" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '4px 8px', borderRadius: '4px' }}>ADMIN</span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} color="var(--text-sub)" /></button>
        </div>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', backgroundColor: 'var(--surface-container-lowest)', flexWrap: 'wrap' }}>
        <button 
          style={{ flex: '1 1 100px', padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'RESULTS' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'RESULTS' ? 'var(--primary)' : 'var(--text-sub)', fontWeight: 'bold' }}
          onClick={() => setActiveTab('RESULTS')}
        >
          집계 현황
        </button>
        <button 
          style={{ flex: '1 1 100px', padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'DEPARTMENTS' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'DEPARTMENTS' ? 'var(--primary)' : 'var(--text-sub)', fontWeight: 'bold' }}
          onClick={() => setActiveTab('DEPARTMENTS')}
        >
          부서 관리
        </button>
        <button 
          style={{ flex: '1 1 100px', padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'CRITERIA' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'CRITERIA' ? 'var(--primary)' : 'var(--text-sub)', fontWeight: 'bold' }}
          onClick={() => setActiveTab('CRITERIA')}
        >
          항목 관리
        </button>
        <button 
          style={{ flex: '1 1 100px', padding: '12px', background: 'none', border: 'none', borderBottom: activeTab === 'SETTINGS' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'SETTINGS' ? 'var(--primary)' : 'var(--text-sub)', fontWeight: 'bold' }}
          onClick={() => { setActiveTab('SETTINGS'); fetchAnonCounter(); }}
        >
          시스템 설정
        </button>
      </div>

      <div className="container" style={{ paddingTop: '16px' }}>
        {activeTab === 'RESULTS' && (
          <>
            <div className="card" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="label-md" style={{ display: 'block', marginBottom: '4px' }}>날짜 선택</label>
                  <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="label-md" style={{ display: 'block', marginBottom: '4px' }}>부서 선택</label>
                  <select 
                    className="input-field" 
                    value={selectedDept} 
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setCheckedResults([]);
                    }}
                  >
                    <option value="전체">전체 부서</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: '1 1 100px' }} onClick={() => handleFetchResults(selectedDept)}>
                  <BarChart3 size={18} />
                  조회
                </button>
                <button className="btn btn-secondary" style={{ flex: '1 1 120px', backgroundColor: '#107c41', color: 'white', borderColor: '#107c41' }} onClick={handleDownloadExcel}>
                  <Download size={18} />
                  선택부서 다운
                </button>
                <button className="btn btn-secondary" style={{ flex: '1 1 120px', backgroundColor: '#107c41', color: 'white', borderColor: '#107c41' }} onClick={handleDownloadAllExcel}>
                  <Download size={18} />
                  전체 다운
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px', backgroundColor: 'var(--surface-header)', borderColor: 'var(--primary)' }}>
              <h3 className="title-md" style={{ marginBottom: '12px', color: 'var(--primary)' }}>
                {selectedDept === '전체' ? '전체 부서' : (selectedDept || '부서')} 총점 평균
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                {criteria?.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="body-md">{c.label}</span><span className="title-md">{averages[c.id] || 0}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--primary)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="title-md">종합</span>
                <span className="headline-md" style={{ color: 'var(--primary)' }}>{averages.total}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                className={summaryMode === 'DETAIL' ? 'btn btn-primary' : 'btn btn-secondary'} 
                style={{ flex: '1 1 90px', padding: '8px', fontSize: '12px' }}
                onClick={() => setSummaryMode('DETAIL')}
              >상세 내역</button>
              <button 
                className={summaryMode === 'BY_DEPT' ? 'btn btn-primary' : 'btn btn-secondary'} 
                style={{ flex: '1 1 90px', padding: '8px', fontSize: '12px' }}
                onClick={() => setSummaryMode('BY_DEPT')}
              >부서별 집계</button>
              <button 
                className={summaryMode === 'BY_EVALUATOR' ? 'btn btn-primary' : 'btn btn-secondary'} 
                style={{ flex: '1 1 90px', padding: '8px', fontSize: '12px' }}
                onClick={() => setSummaryMode('BY_EVALUATOR')}
              >평가자별 집계</button>
            </div>

            {summaryMode === 'DETAIL' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="title-md">상세 평가 내역</h3>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 size={16} /> 선택 삭제
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {results.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)' }} className="body-md">
                      조회된 평가 내역이 없습니다.
                    </div>
                  )}
                  {results.map((r, i) => !r.isDeleted && (
                    <div key={i} className="card" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="title-md">{r.name} 심사위원</span>
                          <span className="label-sm" style={{ color: 'var(--text-sub)' }}>{r.department_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="label-md" style={{ backgroundColor: 'var(--surface-container)', padding: '2px 8px', borderRadius: '12px' }}>총 {r.total}점</span>
                          <input 
                            type="checkbox" 
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            checked={checkedResults.includes(i)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedResults([...checkedResults, i]);
                              } else {
                                setCheckedResults(checkedResults.filter(idx => idx !== i));
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', color: 'var(--text-sub)', fontSize: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {criteria?.map(c => (
                          <span key={c.id} style={{ whiteSpace: 'nowrap' }}>{c.label}: {r[c.id] || 0}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(summaryMode === 'BY_DEPT' || summaryMode === 'BY_EVALUATOR') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 className="title-md" style={{ marginBottom: '8px' }}>
                  {summaryMode === 'BY_DEPT' ? '부서별 집계' : '평가자별 집계'}
                </h3>
                {results.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)' }} className="body-md">
                    데이터가 없습니다.
                  </div>
                )}
                {getAggregatedResults(summaryMode === 'BY_DEPT' ? 'department_name' : 'name').map((agg, idx) => (
                  <div key={idx} className="card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span className="title-md">{agg.key}</span>
                      <span className="label-md" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '3px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>총점 <strong>{agg.totalScore}</strong>점</span>
                        <span style={{ opacity: 0.5 }}>|</span>
                        <span>평균 <strong>{agg.avgTotal}</strong>점</span>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>({agg.count}건)</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--text-sub)', fontSize: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {criteria?.map(c => (
                        <span key={c.id} style={{ whiteSpace: 'nowrap' }}>{c.label}: {agg.avgCriteria[c.id] || 0}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'DEPARTMENTS' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> 부서 관리
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="새 부서명 입력" 
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddDepartment}>
                <Plus size={18} /> 추가
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {departments.map((dept, index) => (
                <div 
                  key={dept} 
                  draggable={editDeptOld !== dept}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px', 
                    backgroundColor: dragOverItemIndex === index ? 'var(--surface-container)' : 'var(--surface-container-low)', 
                    borderRadius: 'var(--rounded-md)', 
                    border: dragOverItemIndex === index ? '2px dashed var(--primary)' : '1px solid var(--surface-border)',
                    cursor: editDeptOld === dept ? 'default' : 'grab'
                  }}
                >
                  {editDeptOld === dept ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '8px' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={editDeptNew}
                        onChange={(e) => setEditDeptNew(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-primary" style={{ padding: '8px' }} onClick={handleEditSave}>저장</button>
                      <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setEditDeptOld('')}>취소</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GripVertical size={16} color="var(--text-sub)" />
                        <span className="body-md">{dept}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleEditClick(dept)}>
                          <Edit2 size={16} color="var(--primary)" />
                        </button>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteDepartment(dept)}>
                          <Trash2 size={16} color="var(--error)" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {departments.length === 0 && (
                <div className="body-md" style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '24px 0' }}>등록된 부서가 없습니다.</div>
              )}
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px', padding: '14px' }} 
              onClick={handleSyncDepartments}
            >
              <Save size={18} /> 부서 설정 최종 저장
            </button>
          </div>
        )}

        {activeTab === 'CRITERIA' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} /> 평가 항목 관리
              </h3>
              <button className="btn btn-secondary" onClick={handleAddCriterion} style={{ padding: '6px 12px', fontSize: '12px' }}>
                <Plus size={16} /> 항목 추가
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {criteria?.map((c, index) => (
                <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--rounded-md)', border: '1px solid var(--surface-border)' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '4px' }}>항목명</label>
                    <textarea 
                      className="input-field" 
                      style={{ resize: 'vertical', minHeight: '40px', whiteSpace: 'pre-wrap' }}
                      value={c.label}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].label = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '4px' }}>세부설명</label>
                    <textarea 
                      className="input-field" 
                      style={{ resize: 'vertical', minHeight: '40px', whiteSpace: 'pre-wrap' }}
                      value={c.description}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].description = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                  </div>
                  <div style={{ width: '80px' }}>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '4px' }}>최대 점수</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={c.maxScore}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].maxScore = Number(e.target.value) || 0;
                        setCriteria(newCriteria);
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} onClick={() => handleDeleteCriterion(c.id)}>
                      <Trash2 size={18} color="var(--error)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px', padding: '14px' }} 
              onClick={handleSyncCriteria}
            >
              <Save size={18} /> 평가 항목 설정 최종 저장
            </button>
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Login Mode Settings Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} /> 기본 로그인 방식 설정
              </h3>
              <p className="body-md" style={{ color: 'var(--text-sub)' }}>
                평가자들이 접속했을 때 처음 나타나는 기본 로그인 방식을 지정합니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'ANONYMOUS', title: '무기명 접속 방식 (기본)', desc: '클릭 한 번으로 접속하며 접속 순서대로 [평가자 1], [평가자 2]... 순번이 자동 부여됩니다.' },
                  { key: 'NAME', title: '이름 직접 입력 방식', desc: '평가자가 본인의 이름을 텍스트 입력창에 직접 타이핑하여 입장합니다.' },
                  { key: 'LIST', title: '리스트 선택 방식', desc: '사전 등록된 평가자 명단 드롭다운에서 본인 이름을 선택하여 입장합니다.' },
                  { key: 'ID_PW', title: '사번/비밀번호 보안 로그인', desc: '사번과 패스워드를 입력하여 검증 후 입장합니다.' }
                ].map((mode) => (
                  <label 
                    key={mode.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: selectedAuthMode === mode.key ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                      backgroundColor: selectedAuthMode === mode.key ? 'var(--surface-container-low, #f0f4f9)' : 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="authModeRadio" 
                      value={mode.key}
                      checked={selectedAuthMode === mode.key}
                      onChange={(e) => setSelectedAuthMode(e.target.value)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: selectedAuthMode === mode.key ? 'var(--primary)' : 'var(--text-main)' }}>
                        {mode.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                        {mode.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <button 
                type="button"
                className="btn btn-primary"
                style={{ padding: '12px', marginTop: '4px' }}
                onClick={() => handleSaveAndRedirectLogin(selectedAuthMode)}
              >
                <Save size={16} /> 설정 저장 후 메인 화면으로 이동
              </button>
            </div>

            {/* Anonymous Evaluator Counter Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} /> 무기명 평가자 순번 관리
              </h3>
              <p className="body-md" style={{ color: 'var(--text-sub)' }}>
                무기명 접속 버튼을 누른 평가자에게 부여된 순번 상태를 확인하고 필요 시 0으로 초기화합니다.
              </p>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                backgroundColor: 'var(--surface-container-low, #f0f4f9)', 
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>현재 발급된 마지막 순번</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
                    {anonCounter > 0 ? `평가자 ${anonCounter}` : '발급 내역 없음 (0번)'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                    다음 접속자에게 부여될 이름: <strong>평가자 {anonCounter + 1}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                    onClick={fetchAnonCounter}
                  >
                    <RefreshCw size={14} /> 새로고침
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '12px', borderColor: 'var(--error)', color: 'var(--error)' }}
                    onClick={handleResetAnonCounter}
                  >
                    순번 0으로 초기화
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
