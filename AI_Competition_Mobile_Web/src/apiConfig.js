// Render 또는 개발 환경에 따른 API URL 자동 설정
const getAutoApiUrl = () => {
  if (typeof window === 'undefined') return 'https://vote1.onrender.com';
  
  // 로컬 개발 환경
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Render.com 호스팅 환경 (vote1-web.onrender.com -> https://vote1.onrender.com)
  if (window.location.hostname.includes('.onrender.com')) {
    const backendHost = window.location.hostname.replace(/-web(?=\.onrender\.com)/, '');
    return `https://${backendHost}`;
  }
  
  return 'https://vote1.onrender.com';
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || getAutoApiUrl();
