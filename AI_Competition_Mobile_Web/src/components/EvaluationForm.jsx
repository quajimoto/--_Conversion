import React, { useState } from 'react';
import { Save, CheckCircle, LogOut, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EvaluationForm = ({ user, onLogout, departments, criteria }) => {
  const navigate = useNavigate();
  
  const [department, setDepartment] = useState(() => departments?.[0] || '');
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
    setStatus('TEMP');
    alert('임시 저장되었습니다. 최종 반영을 위해 반드시 [제출]을 클릭해주세요.');
  };

  const submitToAPI = async () => {
    try {
      await fetch('http://101.79.29.163:3001/api/evaluation/submit', {
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
        <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 일자</label>
            <input 
              type="date" 
              className="input-field" 
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={status === 'SUBMITTED'}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 부서</label>
            <select 
              className="input-field" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              disabled={status === 'SUBMITTED'}
            >
              <option value="">부서 선택</option>
              {departments?.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${criteria?.length || 4}, 1fr)`, gap: '8px', marginBottom: '24px' }}>
          {criteria?.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: status === 'SUBMITTED' ? 'var(--status-locked)' : 'var(--surface-container-lowest)' }}>
              <div>
                <div className="title-md" style={{ whiteSpace: 'pre-wrap' }}>{c.label}</div>
                <div className="label-sm" style={{ color: 'var(--text-sub)', whiteSpace: 'pre-wrap' }}>{c.description}</div>
              </div>
              <input 
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
                <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '12px', backgroundColor: 'var(--surface-container-low)' }}>
                  <div style={{ flex: 1 }}>
                    <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 일자</label>
                    <input type="date" className="input-field" value={evalData.date} disabled style={{ backgroundColor: '#e9ecef' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label-md" style={{ display: 'block', marginBottom: '8px' }}>평가 부서</label>
                    <input type="text" className="input-field" value={evalData.department} disabled style={{ backgroundColor: '#e9ecef' }} />
                  </div>
                </div>

                {/* Completed Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${criteria?.length || 4}, 1fr)`, gap: '8px', marginBottom: '16px' }}>
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
