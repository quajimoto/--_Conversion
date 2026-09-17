// Render 또는 개발 환경에 따른 API URL 자동 설정
const getAutoApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  
  // 로컬 개발 환경
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Render.com 호스팅 환경 자동 감지 (web -> api)
  if (window.location.hostname.includes('.onrender.com')) {
    const apiHost = window.location.hostname.replace('-web.', '-api.');
    return `${window.location.protocol}//${apiHost}`;
  }
  
  return '';
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || getAutoApiUrl();
