import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, LogOut, ArrowRight, ChevronDown, ChevronUp, FolderOpen, Trash2, X, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';

const EvaluationForm = ({ user, onLogout, departments, criteria }) => {
  const navigate = useNavigate();

  // Accordion expand/collapse state for completed evaluations (default: collapsed)
  const [expandedDepts, setExpandedDepts] = useState({});

  const toggleDeptExpand = (dept) => {
    setExpandedDepts(prev => ({
      ...prev,
      [dept]: !prev[dept]
    }));
  };
  
  // Temporary Drafts Management
  const getTempStorageKey = () => `temp_evaluations_${user?.name || 'anonymous'}`;
  const getActiveFormStorageKey = () => `active_eval_form_${user?.name || 'anonymous'}`;
  const getCompletedStorageKey = () => `completed_evaluations_${user?.name || 'anonymous'}`;

  const getSavedActiveState = () => {
    try {
      const data = localStorage.getItem(getActiveFormStorageKey());
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };
  const savedActive = getSavedActiveState();

  const [department, setDepartment] = useState(() => savedActive?.department || departments?.[0] || '');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);

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

  // Ensure department is automatically defaulted to first department when loaded if empty
  useEffect(() => {
    if (!department && departments && departments.length > 0) {
      setDepartment(departments[0]);
    }
  }, [departments, department]);

  const [evaluationDate, setEvaluationDate] = useState(() => {
    if (savedActive?.date) return savedActive.date;
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  });

  const [scores, setScores] = useState(() => {
    if (savedActive?.scores && Object.keys(savedActive.scores).length > 0) {
      return savedActive.scores;
    }
    const init = {};
    criteria?.forEach(c => init[c.id] = '');
    return init;
  });
  
  const [status, setStatus] = useState(() => savedActive?.status || 'DRAFT'); // DRAFT, TEMP, SUBMITTED
  const [completedEvaluations, setCompletedEvaluations] = useState(() => {
    try {
      const data = localStorage.getItem(getCompletedStorageKey());
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  // Auto-persist active form changes to localStorage
  useEffect(() => {
    if (!user?.name) return;
    const activeData = {
      department,
      date: evaluationDate,
      scores,
      status
    };
    localStorage.setItem(getActiveFormStorageKey(), JSON.stringify(activeData));
  }, [department, evaluationDate, scores, status, user?.name]);

  // Auto-persist completedEvaluations to localStorage
  useEffect(() => {
    if (!user?.name) return;
    localStorage.setItem(getCompletedStorageKey(), JSON.stringify(completedEvaluations));
  }, [completedEvaluations, user?.name]);

  // Sync completed evaluations from backend on mount (DB is Single Source of Truth)
  useEffect(() => {
    if (!user?.name) return;
    fetch(`${API_BASE_URL}/api/admin/results`)
      .then(res => res.json())
      .then(data => {
        if (data && data.results) {
          const myEvals = data.results.filter(r => r.name === user.name && !r.isDeleted);
          const formatted = myEvals.map(ev => {
            const sc = {};
            criteria?.forEach(c => {
              if (ev[c.id] !== undefined) sc[c.id] = ev[c.id];
            });
            return {
              date: ev.date,
              department: ev.department_name,
              scores: sc,
              totalScore: ev.total
            };
          });
          // Match DB exactly: if deleted in DB, it is immediately deleted on client
          setCompletedEvaluations(formatted);
          localStorage.setItem(getCompletedStorageKey(), JSON.stringify(formatted));
        }
      })
      .catch(err => console.error('Failed to sync completed evaluations:', err));
  }, [user?.name, criteria]);

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

  const isAllEvaluated = Boolean(
    departments && 
    departments.length > 0 && 
    departments.every(d => completedEvaluations.some(e => e.department === d))
  );

  const handleSave = () => {
    if (isAllEvaluated) {
      alert('모든 부서의 평가가 이미 최종 완료되었습니다.\n수정이 필요하신 경우 아래 [완료된 평가 내역]의 [점수 수정]을 이용해주세요.');
      return;
    }
    const targetDept = department || departments?.[0] || '';
    if (!targetDept) {
      alert('등록된 부서가 없습니다.');
      return;
    }
    if (!department) setDepartment(targetDept);
    if (!checkZeroScoresAndConfirm()) return;

    const currentDrafts = getSavedDrafts();
    const now = new Date();
    const timeString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newDraft = {
      department: targetDept,
      date: evaluationDate,
      scores: { ...scores },
      totalScore,
      savedAt: timeString
    };

    currentDrafts[targetDept] = newDraft;
    localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
    setSavedDrafts({ ...currentDrafts });
    setStatus('TEMP');
    alert(`[${targetDept}] 평가 내용이 성공적으로 임시저장되었습니다.\n언제든 [불러오기] 메뉴에서 다시 불러올 수 있습니다.`);
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

  const submitToAPI = async (targetDept) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/evaluation/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluator_name: user?.name || '익명',
          department_name: targetDept || department,
          eval_date: evaluationDate,
          total_score: totalScore,
          scores: scores
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return true;
    } catch(e) {
      console.error(e);
      alert(`[${targetDept || department}] 평가 서버 저장에 실패했습니다:\n` + e.message);
      return false;
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
    if (isAllEvaluated) {
      alert('모든 부서의 평가가 이미 정상적으로 최종 저장 및 제출 완료되었습니다.\n점수 수정이 필요하신 경우 아래 [완료된 평가 내역]에서 바로 [점수 수정]을 이용해주세요.');
      return;
    }

    const targetDept = department || departments?.[0] || '';
    if (!targetDept) {
      alert('등록된 부서가 없습니다. 관리자 메뉴에서 부서를 먼저 등록해주세요.');
      return;
    }

    if (!department) {
      setDepartment(targetDept);
    }

    // 0점 / 미입력 항목 확인
    if (!checkZeroScoresAndConfirm()) return;

    // 최종 제출 전 한 번 더 확인 확인창
    const isConfirmed = confirm(
      `[${targetDept}] 부서의 평가를 최종 제출하시겠습니까?\n작성하신 점수를 한 번 더 확인해 주세요.\n\n(확인: 최종 저장 및 제출 / 취소: 현재 화면 유지)`
    );

    if (!isConfirmed) {
      return; // 취소 클릭 시 아무것도 변경하지 않고 현재 화면 유지
    }
    
    const saved = await submitToAPI(targetDept);
    if (!saved) return; // 저장 실패 시 다음 부서로 이동하지 않고 유지

    // Clean up temporary draft for this department upon final submit
    const currentDrafts = getSavedDrafts();
    if (currentDrafts[targetDept]) {
      delete currentDrafts[targetDept];
      localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
      setSavedDrafts({ ...currentDrafts });
    }

    const newCompleted = [{
      date: evaluationDate,
      department: targetDept,
      scores: { ...scores },
      totalScore
    }, ...completedEvaluations];
    
    setCompletedEvaluations(newCompleted);
    setExpandedDepts(prev => ({ ...prev, [targetDept]: false }));
    
    setScores(() => {
      const init = {};
      criteria?.forEach(c => init[c.id] = '');
      return init;
    });
    setStatus('DRAFT');
    
    const nextDept = getNextUnevaluatedDepartment(targetDept, newCompleted);
    if (nextDept) {
      setDepartment(nextDept);
    } else {
      setDepartment('');
      alert('🎉 모든 부서의 평가가 성공적으로 최종 저장 및 완료되었습니다!\n수고하셨습니다.');
    }
  };

  const handleSkipNext = async () => {
    if (isAllEvaluated) {
      alert('모든 부서의 평가가 이미 완료되었습니다.');
      return;
    }
    const targetDept = department || departments?.[0] || '';
    if (!targetDept) {
      alert('등록된 부서가 없습니다.');
      return;
    }
    if (!department) setDepartment(targetDept);

    if (!checkZeroScoresAndConfirm()) return;
    const saved = await submitToAPI(targetDept);
    if (!saved) return;

    // Clean up temporary draft for this department upon final submit
    const currentDrafts = getSavedDrafts();
    if (currentDrafts[targetDept]) {
      delete currentDrafts[targetDept];
      localStorage.setItem(getTempStorageKey(), JSON.stringify(currentDrafts));
      setSavedDrafts({ ...currentDrafts });
    }

    const newCompleted = [{
      date: evaluationDate,
      department: targetDept,
      scores: { ...scores },
      totalScore
    }, ...completedEvaluations];
    
    setCompletedEvaluations(newCompleted);
    setExpandedDepts(prev => ({ ...prev, [targetDept]: false }));
    
    setScores(() => {
      const init = {};
      criteria?.forEach(c => init[c.id] = '');
      return init;
    });
    setStatus('DRAFT');
    
    const nextDept = getNextUnevaluatedDepartment(targetDept, newCompleted);
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
    setExpandedDepts(prev => ({ ...prev, [evalData.department]: true }));
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
      const res = await fetch(`${API_BASE_URL}/api/evaluation/submit`, {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

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
      alert('서버 저장에 실패했습니다:\n' + e.message);
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
        {isAllEvaluated ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 20px', backgroundColor: 'var(--surface-container-lowest)', border: '2px solid var(--primary)', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--primary-container, #e3f2fd)', color: 'var(--primary)', marginBottom: '16px' }}>
              <CheckCircle size={44} color="var(--primary)" />
            </div>
            <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
              모든 부서 평가가 완료되었습니다!
            </h2>
            <p className="body-md" style={{ color: 'var(--text-sub)', lineHeight: '1.6', margin: '0 auto 16px', maxWidth: '440px' }}>
              전 부서({departments.length}개 부서)의 평가 점수가 서버에 안전하게 최종 저장되었습니다.<br />
              점수를 다시 검토하거나 수정하시려면 아래 <strong>[완료된 평가 내역]</strong>에서 <strong>[점수 수정]</strong>을 이용해 주세요.
            </p>
          </div>
        ) : (
          <>
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

            {/* Score Cards with Interactive Slider */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {criteria?.map((c) => {
                const maxScore = c.maxScore || 10;
                const currentScore = scores[c.id] === '' || scores[c.id] === undefined ? 0 : Number(scores[c.id]);
                const isTouched = scores[c.id] !== '' && scores[c.id] !== undefined;

                return (
                  <div 
                    key={c.id} 
                    className="card" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px', 
                      padding: '16px',
                      backgroundColor: status === 'SUBMITTED' ? 'var(--status-locked)' : 'var(--surface-container-lowest)',
                      border: isTouched ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                      boxShadow: isTouched ? '0 2px 8px rgba(26, 100, 119, 0.08)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header: Label, Description & Dynamic Score Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div className="title-md" style={{ color: 'var(--text-main)', marginBottom: '2px', whiteSpace: 'pre-wrap' }}>{c.label}</div>
                        <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description || `최대 ${maxScore}점`}</div>
                      </div>
                      
                      {/* Dynamic Score Display Badge */}
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'baseline', 
                        gap: '2px', 
                        backgroundColor: isTouched ? 'var(--primary)' : 'var(--surface-container)', 
                        color: isTouched ? 'white' : 'var(--text-sub)', 
                        padding: '4px 12px', 
                        borderRadius: '20px',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '20px', fontWeight: '800', lineHeight: 1 }}>{currentScore}</span>
                        <span style={{ fontSize: '12px', opacity: 0.85 }}>/ {maxScore}점</span>
                      </div>
                    </div>

                    {/* Interactive Range Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input 
                        ref={(el) => inputRefs.current[c.id] = el}
                        id={`score-slider-${c.id}`}
                        type="range" 
                        min="0"
                        max={maxScore}
                        step="1"
                        className="score-slider"
                        value={currentScore} 
                        onChange={(e) => handleScoreChange(c.id, e.target.value)}
                        onInput={(e) => handleScoreChange(c.id, e.target.value)}
                        disabled={status === 'SUBMITTED'}
                      />
                      {/* Scale Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-sub)', padding: '0 2px' }}>
                        <span>0점</span>
                        <span>중간 ({Math.round(maxScore / 2)}점)</span>
                        <span>최대 ({maxScore}점)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          </>
        )}
        
        {/* Completed Evaluations */}
        {completedEvaluations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px', borderTop: '2px dashed var(--surface-border)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="title-md" style={{ color: 'var(--text-sub)' }}>완료된 평가 내역 (최신순)</h3>
              <span className="label-sm" style={{ color: 'var(--text-sub)' }}>완료된 부서도 아래에서 바로 점수 수정이 가능합니다</span>
            </div>
            {completedEvaluations.map((evalData, idx) => {
              const isEditing = editingCompletedIndex === idx;
              const isExpanded = isEditing || Boolean(expandedDepts[evalData.department]);
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
                  {/* Completed Header - Non-clickable header container */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '12px',
                      marginBottom: isExpanded ? '16px' : '0'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                      <span className="label-md" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                        총 {currentCardTotal}점
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="label-md" style={{ color: 'var(--text-sub)', fontSize: '12px' }}>
                        평가 일자: {evalData.date}
                      </span>
                      {!isEditing && (
                        <>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '12px', 
                              height: '32px', 
                              minHeight: '32px', 
                              borderColor: 'var(--primary)', 
                              color: 'var(--primary)', 
                              fontWeight: 'bold', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              boxSizing: 'border-box' 
                            }}
                            onClick={() => handleStartEditCompleted(idx, evalData)}
                          >
                            <Edit2 size={13} />
                            점수 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDeptExpand(evalData.department)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              backgroundColor: isExpanded ? 'var(--surface-container-low, #f2f4f5)' : 'white',
                              border: '1px solid var(--primary)',
                              borderRadius: '4px',
                              width: '90px',
                              minWidth: '90px',
                              height: '32px',
                              minHeight: '32px',
                              fontSize: '12px',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontWeight: '600',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            {isExpanded ? (
                              <>접기 <ChevronUp size={14} /></>
                            ) : (
                              <>항목보기 <ChevronDown size={14} /></>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Content: Only rendered when isExpanded is true */}
                  {isExpanded && (
                    <>
                      {/* Completed Score Cards with Slider */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        {criteria?.map((c) => {
                          const maxScore = c.maxScore || 10;
                          const rawScore = isEditing 
                            ? (editingScores[c.id] ?? '') 
                            : (evalData.scores[c.id] ?? '');
                          const scoreVal = rawScore === '' ? 0 : Number(rawScore);

                          return (
                            <div 
                              key={c.id} 
                              className="card" 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px', 
                                padding: '16px',
                                backgroundColor: isEditing ? 'white' : 'var(--status-locked)',
                                border: isEditing ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div className="title-md" style={{ color: 'var(--text-main)', marginBottom: '2px', whiteSpace: 'pre-wrap' }}>{c.label}</div>
                                  <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description || `최대 ${maxScore}점`}</div>
                                </div>
                                <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'baseline', 
                                  gap: '2px', 
                                  backgroundColor: isEditing ? 'var(--primary)' : 'var(--surface-container)', 
                                  color: isEditing ? 'white' : 'var(--text-sub)', 
                                  padding: '4px 12px', 
                                  borderRadius: '20px',
                                  flexShrink: 0
                                }}>
                                  <span style={{ fontSize: '20px', fontWeight: '800', lineHeight: 1 }}>{scoreVal}</span>
                                  <span style={{ fontSize: '12px', opacity: 0.85 }}>/ {maxScore}점</span>
                                </div>
                              </div>
                              
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <input 
                                    ref={el => { if (isEditing) editInputRefs.current[c.id] = el; }}
                                    type="range" 
                                    min="0"
                                    max={maxScore}
                                    step="1"
                                    className="score-slider"
                                    value={scoreVal} 
                                    onChange={(e) => handleEditScoreChange(c.id, e.target.value)}
                                    onInput={(e) => handleEditScoreChange(c.id, e.target.value)}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-sub)', padding: '0 2px' }}>
                                    <span>0점</span>
                                    <span>중간 ({Math.round(maxScore / 2)}점)</span>
                                    <span>최대 ({maxScore}점)</span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, Math.max(0, (scoreVal / maxScore) * 100))}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                                </div>
                              )}
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
                    </>
                  )}
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
