import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, LogOut, ArrowRight, ChevronDown, FolderOpen, Trash2, X, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';

const EvaluationForm = ({ user, onLogout, departments, criteria }) => {
  const navigate = useNavigate();
  
  const [department, setDepartment] = useState(() => departments?.[0] || '');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);

  // Temporary Drafts Management
  const getTempStorageKey = () => `temp_evaluations_${user?.name || 'anonymous'}`;

  const getSavedDrafts = () => {
    try {
      const data = localStorage.getItem(getTempStorageKey());
      return data ? JSON.parse(data) : {};
    } catch(e) {
      console.error(e);
      return {};
    }
  };

  const [savedDrafts, setSavedDrafts] = useState(() => getSavedDrafts());
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const [evaluationDate, setEvaluationDate] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  });
  const [scores, setScores] = useState(() => {
    const init = {};
    criteria?.forEach(c => init[c.id] = '');
    return init;
  });
  
  const [status, setStatus] = useState('DRAFT'); // DRAFT, TEMP, SUBMITTED
  const [completedEvaluations, setCompletedEvaluations] = useState([]);

  const inputRefs = useRef({});

  const checkZeroScoresAndConfirm = () => {
    // Find criteria with 0 points or empty values (undefined, null, '', 0, '0')
    const zeroCriteria = criteria?.filter(c => {
      const val = scores[c.id];
      return val === undefined || val === null || val === '' || val === 0 || val === '0' || Number(val || 0) === 0;
    }) || [];

    if (zeroCriteria.length > 0) {
      const zeroLabels = zeroCriteria.map(c => c.label).join(', ');
      const isConfirmed = window.confirm(
        `평가 항목 중 0점이거나 값이 입력되지 않은 항목이 있습니다.\n[${zeroLabels}]\n\n0점이 맞습니까?`
      );
      
      if (!isConfirmed) {
        // Focus cursor to the first 0-point or empty item when user clicks Cancel
        const firstZero = zeroCriteria[0];
        if (firstZero && inputRefs.current[firstZero.id]) {
          inputRefs.current[firstZero.id].focus();
          inputRefs.current[firstZero.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      }
    }
    return true;
  };

  const handleScoreChange = (field, value) => {
    if (status === 'SUBMITTED') return;
    
    const numValue = value === '' ? '' : Number(value);
    
    const criterion = criteria.find(c => c.id === field);
    const maxScore = criterion ? criterion.maxScore : 10;
    
    // Validation
    if (numValue !== '' && numValue > maxScore) {
      alert(`${criterion?.label || field} 항목의 최대 점수는 ${maxScore}점입니다.`);
      return;
    }
    
    if (numValue !== '' && numValue < 0) return;

    setScores(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = () => {
    if (!department) {
      alert('임시저장할 부서를 먼저 선택해주세요.');
      return;
    }
    if (!checkZeroScoresAndConfirm()) return;

    const currentDrafts = getSavedDrafts();
    const now = new Date();
    const timeString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newDraft = {
      department,
      date: evaluationDate,
      scores: { ...scores },
      totalScore,
      savedAt: timeString
    };

    currentDrafts[department] = newDraft;
    localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
    setSavedDrafts({ ...currentDrafts });
    setStatus('TEMP');
    alert(`[${department}] 평가 내용이 성공적으로 임시저장되었습니다.\n언제든 [불러오기] 메뉴에서 다시 불러올 수 있습니다.`);
  };

  const handleOpenLoadModal = () => {
    const current = getSavedDrafts();
    setSavedDrafts(current);
    const keys = Object.keys(current);
    if (keys.length === 0) {
      alert('임시 저장된 평가 데이터가 없습니다.\n먼저 [임시저장]을 진행해주세요.');
      return;
    }
    setIsLoadModalOpen(true);
  };

  const handleLoadDraft = (draft) => {
    if (!draft) return;
    
    // Check if form currently has scores that differ
    const hasCurrentScores = Object.values(scores).some(v => v !== '' && Number(v) > 0);
    if (hasCurrentScores && (department !== draft.department || JSON.stringify(scores) !== JSON.stringify(draft.scores))) {
      if (!confirm(`[${draft.department}]의 임시저장 데이터를 불러오시겠습니까?\n현재 입력창에 작성 중인 점수는 불러온 데이터로 대체됩니다.`)) {
        return;
      }
    }

    setDepartment(draft.department);
    setEvaluationDate(draft.date);
    setScores(draft.scores);
    setStatus('TEMP');
    setIsLoadModalOpen(false);
    alert(`[${draft.department}]의 임시저장 데이터를 불러왔습니다.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = (deptToDelete) => {
    if (!confirm(`[${deptToDelete}]의 임시저장 데이터를 삭제하시겠습니까?`)) return;
    const currentDrafts = getSavedDrafts();
    delete currentDrafts[deptToDelete];
    localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
    setSavedDrafts({ ...currentDrafts });
  };

  const handleClearAllDrafts = () => {
    if (!confirm('모든 임시저장 데이터를 삭제하시겠습니까?')) return;
    localStorage.removeItem(getTempStorageKey());
    setSavedDrafts({});
    setIsLoadModalOpen(false);
  };

  const submitToAPI = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/evaluation/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluator_name: user?.name || '익명',
          department_name: department,
          eval_date: evaluationDate,
          total_score: totalScore,
          scores: scores
        })
      });
    } catch(e) {
      console.error(e);
      alert('서버 저장 실패');
    }
  };

  const getNextUnevaluatedDepartment = (currentDept, completedList) => {
    const currentIndex = departments.indexOf(currentDept);
    // Check forward
    for (let i = currentIndex + 1; i < departments.length; i++) {
      const dept = departments[i];
      if (!completedList.some(e => e.department === dept)) return dept;
    }
    // Check from start to current
    for (let i = 0; i < currentIndex; i++) {
      const dept = departments[i];
      if (!completedList.some(e => e.department === dept)) return dept;
    }
    return null;
  };

  const handleNextDepartment = async () => {
    if (!department) {
      alert('부서를 선택해주세요.');
      return;
    }
    if (!checkZeroScoresAndConfirm()) return;
    if (!confirm('평가를 최종 제출하시겠습니까? 제출 후에는 수정이 불가합니다.')) {
      return;
    }
    
    await submitToAPI();

    // Clean up temporary draft for this department upon final submit
    const currentDrafts = getSavedDrafts();
    if (currentDrafts[department]) {
      delete currentDrafts[department];
      localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
      setSavedDrafts({ ...currentDrafts });
    }

    const newCompleted = [{
      date: evaluationDate,
      department,
      scores,
      totalScore
    }, ...completedEvaluations];
    
    setCompletedEvaluations(newCompleted);
    
    setScores(() => {
      const init = {};
      criteria?.forEach(c => init[c.id] = '');
      return init;
    });
    setStatus('DRAFT');
    
    const nextDept = getNextUnevaluatedDepartment(department, newCompleted);
    if (nextDept) {
      setDepartment(nextDept);
    } else {
      setDepartment('');
      alert('더 이상 평가할 부서가 없습니다. 모든 평가가 완료되었습니다.');
    }
  };

  const handleSkipNext = async () => {
    if (!department) {
      alert('부서를 선택해주세요.');
      return;
    }
    if (!checkZeroScoresAndConfirm()) return;
    await submitToAPI();

    // Clean up temporary draft for this department upon final submit
    const currentDrafts = getSavedDrafts();
    if (currentDrafts[department]) {
      delete currentDrafts[department];
      localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
      setSavedDrafts({ ...currentDrafts });
    }

    const newCompleted = [{
      date: evaluationDate,
      department,
      scores: { ...scores },
      totalScore
    }, ...completedEvaluations];
    
    setCompletedEvaluations(newCompleted);
    
    setScores(() => {
      const init = {};
      criteria?.forEach(c => init[c.id] = '');
      return init;
    });
    setStatus('DRAFT');
    
    const nextDept = getNextUnevaluatedDepartment(department, newCompleted);
    if (nextDept) {
      setDepartment(nextDept);
    } else {
      setDepartment('');
      alert('더 이상 평가할 부서가 없습니다. 모든 평가가 완료되었습니다.');
    }
  };

  // In-place editing for completed evaluations
  const [editingCompletedIndex, setEditingCompletedIndex] = useState(null);
  const [editingScores, setEditingScores] = useState({});
  const editInputRefs = useRef({});

  const handleStartEditCompleted = (idx, evalData) => {
    setEditingCompletedIndex(idx);
    setEditingScores({ ...evalData.scores });
  };

  const handleCancelEditCompleted = () => {
    setEditingCompletedIndex(null);
    setEditingScores({});
  };

  const handleEditScoreChange = (field, value) => {
    const numValue = value === '' ? '' : Number(value);
    const criterion = criteria?.find(c => c.id === field);
    const maxScore = criterion ? criterion.maxScore : 10;

    if (numValue !== '' && numValue > maxScore) {
      alert(`${criterion?.label || field} 항목의 최대 점수는 ${maxScore}점입니다.`);
      return;
    }
    if (numValue !== '' && numValue < 0) return;

    setEditingScores(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSaveEditCompleted = async (idx, evalData) => {
    // 0점 / 미입력 항목 확인
    const zeroCriteria = criteria?.filter(c => {
      const val = editingScores[c.id];
      return val === undefined || val === null || val === '' || val === 0 || val === '0' || Number(val || 0) === 0;
    }) || [];

    if (zeroCriteria.length > 0) {
      const zeroLabels = zeroCriteria.map(c => c.label).join(', ');
      const isConfirmed = window.confirm(
        `[${evalData.department}] 평가 항목 중 0점이거나 값이 입력되지 않은 항목이 있습니다.\n[${zeroLabels}]\n\n0점이 맞습니까?`
      );
      if (!isConfirmed) {
        const firstZero = zeroCriteria[0];
        if (firstZero && editInputRefs.current[firstZero.id]) {
          editInputRefs.current[firstZero.id].focus();
          editInputRefs.current[firstZero.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    const newTotal = Object.values(editingScores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

    try {
      await fetch(`${API_BASE_URL}/api/evaluation/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluator_name: user?.name || '익명',
          department_name: evalData.department,
          eval_date: evalData.date,
          total_score: newTotal,
          scores: editingScores
        })
      });

      setCompletedEvaluations(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          scores: { ...editingScores },
          totalScore: newTotal
        };
        return updated;
      });

      setEditingCompletedIndex(null);
      setEditingScores({});
      alert(`[${evalData.department}] 평가 점수가 성공적으로 수정되었습니다.`);
    } catch(e) {
      console.error(e);
      alert('서버 저장에 실패했습니다.');
    }
  };

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface-header)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', flexWrap: 'wrap', gap: '8px' }}>
        <h2 className="title-md">평가 입력</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleOpenLoadModal} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              backgroundColor: 'white', 
              color: 'var(--primary)', 
              border: '1px solid var(--primary)', 
              padding: '6px 10px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}
          >
            <FolderOpen size={14} />
            불러오기
            {Object.keys(savedDrafts).length > 0 && (
              <span style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '10px', padding: '0 5px', fontSize: '10px', marginLeft: '2px' }}>
                {Object.keys(savedDrafts).length}
              </span>
            )}
          </button>
          {user.role === 'ADMIN' && (
            <button 
              onClick={() => navigate('/admin')} 
              style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              관리자 메뉴
            </button>
          )}
          <span className="label-md">{user.name} 님</span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={20} color="var(--text-sub)" /></button>
        </div>
      </header>

      <div className="container">
        {/* Date and Department Select */}
        <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: isDeptDropdownOpen ? 50 : 1 }}>
          <div style={{ flex: '1 1 140px' }}>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 일자</label>
            <input 
              type="date" 
              className="input-field" 
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={status === 'SUBMITTED'}
            />
          </div>
          <div style={{ flex: '1 1 140px', position: 'relative' }} ref={deptDropdownRef}>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 부서</label>
            
            {/* Custom Dropdown Trigger */}
            <button 
              type="button"
              className="input-field" 
              disabled={status === 'SUBMITTED'}
              onClick={() => {
                if (status !== 'SUBMITTED') {
                  setIsDeptDropdownOpen(prev => !prev);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                cursor: status === 'SUBMITTED' ? 'not-allowed' : 'pointer',
                backgroundColor: status === 'SUBMITTED' ? '#e9ecef' : 'white',
                textAlign: 'left',
                padding: '10px 14px',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ color: department ? 'var(--text-main)' : 'var(--text-sub)' }}>
                {department || '부서 선택'}
              </span>
              <ChevronDown 
                size={18} 
                color="var(--text-sub)" 
                style={{ 
                  transform: isDeptDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0
                }} 
              />
            </button>

            {/* Custom Dropdown Menu (In-page Dropdown Box) */}
            {isDeptDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderRadius: 'var(--rounded-md, 8px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
                  border: '1px solid var(--surface-border)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  onClick={() => {
                    setDepartment('');
                    setIsDeptDropdownOpen(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: !department ? 'var(--primary)' : 'var(--text-sub)',
                    backgroundColor: !department ? 'var(--surface-container-low, #f0f4f9)' : 'transparent',
                    borderBottom: '1px solid var(--surface-border)',
                    fontWeight: !department ? 'bold' : 'normal'
                  }}
                >
                  부서 선택
                </div>
                {departments?.map((d) => {
                  const isSelected = department === d;
                  return (
                    <div
                      key={d}
                      onClick={() => {
                        setDepartment(d);
                        setIsDeptDropdownOpen(false);
                      }}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        backgroundColor: isSelected ? 'var(--surface-container-low, #f0f4f9)' : 'transparent',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--surface-border)'
                      }}
                    >
                      <span>{d}</span>
                      {isSelected && (
                        <span style={{ color: 'var(--primary)', fontSize: '13px' }}>●</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '24px' }}>
          {criteria?.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: status === 'SUBMITTED' ? 'var(--status-locked)' : 'var(--surface-container-lowest)' }}>
              <div>
                <div className="title-md" style={{ whiteSpace: 'pre-wrap' }}>{c.label}</div>
                <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description}</div>
              </div>
              <input 
                ref={(el) => inputRefs.current[c.id] = el}
                id={`score-input-${c.id}`}
                type="number" 
                className="input-field" 
                style={{ width: '100%', backgroundColor: status === 'SUBMITTED' ? '#e9ecef' : 'white' }}
                value={scores[c.id]} 
                onChange={(e) => handleScoreChange(c.id, e.target.value)}
                disabled={status === 'SUBMITTED'}
                placeholder="0"
              />
            </div>
          ))}
        </div>

        {/* Total & Actions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', bottom: '16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="headline-md">총점</span>
            <span className="headline-lg" style={{ color: 'var(--primary)' }}>{totalScore} 점</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: '1 1 70px', padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleSave}
            >
              <Save size={16} />
              임시저장
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: '1 1 70px', padding: '12px 4px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }} 
              onClick={handleOpenLoadModal}
            >
              <FolderOpen size={16} />
              불러오기
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: '1 1 70px', padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleSkipNext}
            >
              <ArrowRight size={16} />
              다음부서
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: '1 1 70px', padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleNextDepartment}
            >
              <CheckCircle size={16} />
              최종 제출
            </button>
          </div>
        </div>
        
        {/* Completed Evaluations */}
        {completedEvaluations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px', borderTop: '2px dashed var(--surface-border)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="title-md" style={{ color: 'var(--text-sub)' }}>완료된 평가 내역 (최신순)</h3>
              <span className="label-sm" style={{ color: 'var(--text-sub)' }}>완료된 부서도 아래에서 바로 점수 수정이 가능합니다</span>
            </div>
            {completedEvaluations.map((evalData, idx) => {
              const isEditing = editingCompletedIndex === idx;
              const currentCardTotal = isEditing 
                ? Object.values(editingScores).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
                : evalData.totalScore;

              return (
                <div 
                  key={idx} 
                  style={{ 
                    border: isEditing ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                    borderRadius: 'var(--rounded-md)',
                    padding: '16px',
                    backgroundColor: isEditing ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)',
                    boxShadow: isEditing ? '0 6px 20px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Completed Date and Department */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="title-md" style={{ color: isEditing ? 'var(--primary)' : 'var(--text-main)', fontSize: '16px', fontWeight: 'bold' }}>
                        {evalData.department}
                      </span>
                      {isEditing ? (
                        <span style={{ fontSize: '11px', backgroundColor: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          현재 위치에서 수정 중
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', backgroundColor: 'var(--surface-container, #eef2f6)', color: 'var(--text-sub)', padding: '2px 8px', borderRadius: '4px' }}>
                          완료됨
                        </span>
                      )}
                    </div>
                    <span className="label-md" style={{ color: 'var(--text-sub)' }}>
                      평가 일자: {evalData.date}
                    </span>
                  </div>

                  {/* Completed Score Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                    {criteria?.map((c) => {
                      const displayScore = isEditing 
                        ? (editingScores[c.id] ?? '') 
                        : (evalData.scores[c.id] ?? '');

                      return (
                        <div 
                          key={c.id} 
                          className="card" 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px', 
                            backgroundColor: isEditing ? 'white' : 'var(--status-locked)',
                            border: isEditing ? '1px solid var(--primary)' : '1px solid var(--surface-border)'
                          }}
                        >
                          <div>
                            <div className="title-md" style={{ whiteSpace: 'pre-wrap' }}>{c.label}</div>
                            <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description}</div>
                          </div>
                          <input 
                            ref={el => { if (isEditing) editInputRefs.current[c.id] = el; }}
                            type="number" 
                            className="input-field" 
                            style={{ width: '100%', backgroundColor: isEditing ? 'white' : '#e9ecef', fontWeight: isEditing ? 'bold' : 'normal' }}
                            value={displayScore} 
                            onChange={(e) => isEditing && handleEditScoreChange(c.id, e.target.value)}
                            disabled={!isEditing}
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Completed Total Score & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--surface-border)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="headline-md">총점</span>
                      <span className="headline-lg" style={{ color: isEditing ? 'var(--primary)' : 'var(--text-main)' }}>
                        {currentCardTotal} 점
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ padding: '8px 14px', fontSize: '13px' }}
                            onClick={handleCancelEditCompleted}
                          >
                            취소
                          </button>
                          <button 
                            type="button"
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            onClick={() => handleSaveEditCompleted(idx, evalData)}
                          >
                            수정 완료
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '8px 14px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleStartEditCompleted(idx, evalData)}
                        >
                          <Edit2 size={14} />
                          점수 수정
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Load Drafts Modal */}
      {isLoadModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setIsLoadModalOpen(false)}
        >
          <div 
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
              <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--primary)' }}>
                <FolderOpen size={20} /> 임시저장 목록
              </h3>
              <button 
                type="button"
                onClick={() => setIsLoadModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="var(--text-sub)" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {Object.keys(savedDrafts).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-sub)' }}>
                  임시 저장된 평가 데이터가 없습니다.
                </div>
              ) : (
                Object.values(savedDrafts).map((draft) => {
                  const isCurrentDept = draft.department === department;
                  return (
                    <div 
                      key={draft.department}
                      style={{
                        border: isCurrentDept ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        backgroundColor: isCurrentDept ? 'var(--surface-container-low, #f0f4f9)' : 'var(--surface-container-lowest)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '15px' }}>{draft.department}</strong>
                          {isCurrentDept && (
                            <span style={{ fontSize: '11px', backgroundColor: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                              현재 부서
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                          {draft.savedAt}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-sub)' }}>평가일자: {draft.date}</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '14px' }}>총점 {draft.totalScore}점</span>
                      </div>

                      {/* Scores preview */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {criteria?.map((c) => {
                          const sc = draft.scores?.[c.id];
                          return (
                            <span key={c.id} style={{ fontSize: '11px', backgroundColor: 'var(--surface-container, #eef2f6)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-sub)' }}>
                              {c.label}: <strong style={{ color: 'var(--text-main)' }}>{sc !== '' && sc !== undefined ? `${sc}점` : '0점'}</strong>
                            </span>
                          );
                        })}
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--error)', borderColor: 'var(--error)' }}
                          onClick={() => handleDeleteDraft(draft.department)}
                        >
                          <Trash2 size={14} />
                          삭제
                        </button>
                        <button 
                          type="button"
                          className="btn btn-primary" 
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={() => handleLoadDraft(draft)}
                        >
                          <FolderOpen size={14} />
                          불러오기
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
              {Object.keys(savedDrafts).length > 0 ? (
                <button 
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                  onClick={handleClearAllDrafts}
                >
                  전체 삭제
                </button>
              ) : <div />}
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setIsLoadModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;
