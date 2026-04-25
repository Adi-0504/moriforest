function renderWeekDays() {
    const dow = document.getElementById('days-of-week-header');
    if(!dow) return;
    const weekMap = {
        "zh-TW": ["日","一","二","三","四","五","六"],
        "zh-CN": ["日","一","二","三","四","五","六"],
        "en": ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    };
    const days = weekMap[userLang] || weekMap["zh-TW"];
    dow.innerHTML = days.map(d => `<div>${d}</div>`).join('');
}

window.renderCalendar = function() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let monthStr = "";
    if(userLang.includes('zh')) monthStr = `${year}年 ${month + 1}月`;
    else monthStr = `${new Intl.DateTimeFormat(userLang, {month:'long'}).format(currentDate)} ${year}`;
    
    document.getElementById('month-year-display').textContent = monthStr;
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    const daysGrid = document.getElementById('calendar-days');
    if(!daysGrid) return;
    daysGrid.innerHTML = '';

    for (let i = firstDayIndex; i > 0; i--) {
        const btn = document.createElement('button');
        btn.textContent = prevLastDay - i + 1;
        btn.className = 'other-month';
        daysGrid.appendChild(btn);
    }

    const daysWithData = new Set();
    transactions.forEach(tx => {
        const parts = tx.date.split('-');
        if(parts.length === 3) {
            const txY = parseInt(parts[0], 10);
            const txM = parseInt(parts[1], 10) - 1;
            const txD = parseInt(parts[2], 10);
            if(txY === year && txM === month) {
                daysWithData.add(txD);
            }
        }
    });

    const today = new Date();
    for (let i = 1; i <= lastDay; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        
        if (daysWithData.has(i)) btn.classList.add('has-data');

        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        if (isToday) btn.classList.add('today');
        
        const isSelected = i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
        if (isSelected) btn.classList.add('selected');

        btn.addEventListener('click', () => {
            selectedDate = new Date(year, month, i);
            renderCalendar(); 
            renderTransactionsForDay(selectedDate);
        });
        daysGrid.appendChild(btn);
    }

    const nextDays = 42 - (firstDayIndex + lastDay);
    for (let i = 1; i <= nextDays; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'other-month';
        daysGrid.appendChild(btn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
});
