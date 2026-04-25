window.updateStreak = function() {
    if (transactions.length === 0) {
        document.getElementById('streak-count').textContent = 0;
        return;
    }
    const today = new Date();
    const toYMD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    let currentYMD = toYMD(today);
    let yesterdayDate = new Date(today);
    yesterdayDate.setDate(today.getDate() - 1);
    let yesterdayYMD = toYMD(yesterdayDate);

    const uniqueDates = [...new Set(transactions.map(tx => tx.date))].sort((a,b) => b.localeCompare(a));
    let streak = 0;

    if (uniqueDates[0] === currentYMD) {
        streak = 1;
        let checkDate = new Date(today);
        for(let i=1; i<uniqueDates.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            if(uniqueDates[i] === toYMD(checkDate)) streak++;
            else break;
        }
    } else if (uniqueDates[0] === yesterdayYMD) {
        streak = 1;
        let checkDate = new Date(yesterdayDate);
        for(let i=1; i<uniqueDates.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            if(uniqueDates[i] === toYMD(checkDate)) streak++;
            else break;
        }
    }

    const badgeObj = document.getElementById('streak-count');
    if(badgeObj) badgeObj.textContent = streak;
    
    const badgeContainer = document.getElementById('streak-badge');
    if (badgeContainer) {
        if (streak > 0) {
            badgeContainer.classList.add('streak-active');
            badgeContainer.style.color = '#E06B6B';
        } else {
            badgeContainer.classList.remove('streak-active');
            badgeContainer.style.color = 'var(--text-muted)';
        }
    }
}

let globalAudioCtx = null;

window.playSubmitEffect = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!globalAudioCtx && AudioContext) {
            globalAudioCtx = new AudioContext();
        }
        
        if (globalAudioCtx) {
            if(globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
            const osc = globalAudioCtx.createOscillator();
            const gainNode = globalAudioCtx.createGain();
            osc.type = 'sine';
            
            osc.frequency.setValueAtTime(400, globalAudioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, globalAudioCtx.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.4, globalAudioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, globalAudioCtx.currentTime + 0.08);
            
            osc.connect(gainNode);
            gainNode.connect(globalAudioCtx.destination);
            
            osc.start(globalAudioCtx.currentTime);
            osc.stop(globalAudioCtx.currentTime + 0.1);
        }
    } catch(e) {
        console.log("Audio creation skipped:", e);
    }

    for (let i = 0; i < 15; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'burst-leaf';
        const colors = ['#2F6B4F', '#A9C7B3', '#81C784', '#4CAF50', '#E06B6B'];
        leaf.style.color = colors[Math.floor(Math.random() * colors.length)];
        
        leaf.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';
        
        leaf.style.left = `calc(50% - 12px + ${(Math.random() - 0.5) * 60}px)`;
        leaf.style.top = `calc(50% + ${(Math.random() - 0.5) * 60}px)`;
        
        leaf.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
        leaf.style.setProperty('--ty', `${-100 - Math.random() * 150}px`);
        leaf.style.setProperty('--duration', `${0.6 + Math.random() * 0.4}s`);
        
        document.body.appendChild(leaf);
        setTimeout(() => leaf.remove(), 1200);
    }
}
