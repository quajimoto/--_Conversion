import React, { useState, useEffect } from 'react';
import { BarChart3, LogOut, ArrowLeft, Users, Plus, Trash2, Edit2, Save, GripVertical, Download } from 'lucide-react';
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
  const [selectedDept, setSelectedDept] = useState(departments[0] || '');
  
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const [results, setResults] = useState([]);
  const [checkedResults, setCheckedResults] = useState([]);
  const [averages, setAverages] = useState({ total: 0 });

  const [newDept, setNewDept] = useState('');
  const [editDeptOld, setEditDeptOld] = useState('');
  const [editDeptNew, setEditDeptNew] = useState('');

  useEffect(() => {
    if (!selectedDept && departments.length > 0) {
      setSelectedDept(departments[0]);
    }
  }, [departments]);

  const handleFetchResults = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/results?department=${encodeURIComponent(selectedDept)}&date=${date}`);
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
      return { key, count: data.count, avgTotal, avgCriteria };
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

  const handleSyncAuthMode = async () => {
    try {
      localStorage.setItem('authMode', authMode);
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authMode })
      });
      if (res.ok) alert('로그인 방식이 성공적으로 저장되었습니다.');
      else alert('저장에 실패했습니다.');
    } catch(e) {
      console.error(e);
      alert('서버 연결 실패 (로컬 저장이 적용되었습니다)');
    }
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
            value={authMode} 
            onChange={(e) => setAuthMode(e.target.value)}
          >
            <option value="LIST">로그인 리스트 선택</option>
            <option value="ID_PW">로그인 ID/PW</option>
            <option value="NAME">로그인 이름 직접입력</option>
          </select>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '12px', minHeight: '32px', height: 'auto', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={handleSyncAuthMode}
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
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: '1 1 100px' }} onClick={handleFetchResults}>
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
              <h3 className="title-md" style={{ marginBottom: '12px', color: 'var(--primary)' }}>{selectedDept || '부서'} 총점 평균</h3>
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
                  {summaryMode === 'BY_DEPT' ? '부서별 평균 점수' : '평가자별 평균 점수'}
                </h3>
                {results.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)' }} className="body-md">
                    데이터가 없습니다.
                  </div>
                )}
                {getAggregatedResults(summaryMode === 'BY_DEPT' ? 'department_name' : 'name').map((agg, idx) => (
                  <div key={idx} className="card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="title-md">{agg.key}</span>
                      <span className="label-md" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '2px 8px', borderRadius: '12px' }}>
                        평균 {agg.avgTotal}점 ({agg.count}건)
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

      </div>
    </div>
  );
};

export default AdminDashboard;
