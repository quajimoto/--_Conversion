import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle, LogOut, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';

const EvaluationForm = ({ user, onLogout, departments, criteria }) => {
  const navigate = useNavigate();
  
  const [department, setDepartment] = useState(() => departments?.[0] || '');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);

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
    if (!checkZeroScoresAndConfirm()) return;
    setStatus('TEMP');
    alert('임시 저장되었습니다. 최종 반영을 위해 반드시 [제출]을 클릭해주세요.');
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

  const handleModify = (evalData) => {
    setDepartment(evalData.department);
    setEvaluationDate(evalData.date);
    setScores(evalData.scores);
    setStatus('DRAFT');
    setCompletedEvaluations(prev => prev.filter(e => e.department !== evalData.department));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface-header)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
        <h2 className="title-md">평가 입력</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleSave}
            >
              <Save size={16} />
              임시저장
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleSkipNext}
            >
              <ArrowRight size={16} />
              다음부서
            </button>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '12px 4px', fontSize: '13px' }} 
              onClick={handleNextDepartment}
            >
              <CheckCircle size={16} />
              최종 제출
            </button>
          </div>
        </div>
        
        {/* Completed Evaluations */}
        {completedEvaluations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '40px', borderTop: '2px dashed var(--surface-border)', paddingTop: '24px' }}>
            <h3 className="title-md" style={{ color: 'var(--text-sub)' }}>완료된 평가 내역 (최신순)</h3>
            {completedEvaluations.map((evalData, idx) => (
              <div key={idx} style={{ opacity: 0.7 }}>
                {/* Completed Date and Department */}
                <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: 'var(--surface-container-low)' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 일자</label>
                    <input type="date" className="input-field" value={evalData.date} disabled style={{ backgroundColor: '#e9ecef' }} />
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 부서</label>
                    <input type="text" className="input-field" value={evalData.department} disabled style={{ backgroundColor: '#e9ecef' }} />
                  </div>
                </div>

                {/* Completed Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                  {criteria?.map((c) => (
                    <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--status-locked)' }}>
                      <div>
                        <div className="title-md" style={{ whiteSpace: 'pre-wrap' }}>{c.label}</div>
                        <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description}</div>
                      </div>
                      <input 
                        type="number" 
                        className="input-field" 
                        style={{ width: '100%', backgroundColor: '#e9ecef' }}
                        value={evalData.scores[c.id]} 
                        disabled
                      />
                    </div>
                  ))}
                </div>
                
                {/* Completed Total Score */}
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-container-low)' }}>
                  <span className="headline-md">총점</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="headline-lg" style={{ color: 'var(--text-sub)' }}>{evalData.totalScore} 점</span>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px', opacity: 1 }}
                      onClick={() => handleModify(evalData)}
                    >
                      수정
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default EvaluationForm;
