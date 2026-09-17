async function check() {
  for (let i = 0; i < 15; i++) {
    try {
      const r = await fetch('https://vote1-web.onrender.com/?t=' + Date.now());
      const text = await r.text();
      const match = text.match(/\/assets\/index-[^"]+\.js/);
      const script = match ? match[0] : 'none';
      console.log(new Date().toLocaleTimeString(), 'Live Script bundle:', script);
      if (script !== '/assets/index-pz6aZAK4.js' && script !== 'none') {
        console.log('✅ New build deployed on Render live!');
        return;
      }
    } catch(e) {
      console.error(e.message);
    }
    await new Promise(res => setTimeout(res, 8000));
  }
}

check();
