window.renderTransactionsForDay = function(dateObj) {
    const listElement = document.getElementById('transaction-list');
    if(!listElement) return;

    let dateTitle = "";
    if(userLang.includes('zh')) dateTitle = `${dateObj.getMonth()+1}月${dateObj.getDate()}日 ${t('day_activity')}`;
    else dateTitle = `${new Intl.DateTimeFormat(userLang, {month:'short', day:'numeric'}).format(dateObj)} ${t('day_activity')}`;
    
    document.getElementById('selected-date-display').textContent = dateTitle;

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    
    const dayTxs = transactions.filter(tx => tx.date === dateString);

    if (dayTxs.length === 0) {
        listElement.innerHTML = `<div class="empty-state">${t('empty_ledger')}</div>`;
        return;
    }

    const sortedTxs = [...dayTxs].sort((a,b) => b.id - a.id);
    const cmap = getCategoryMap();
    const allCat = [...cmap.expense, ...cmap.income];

    listElement.innerHTML = sortedTxs.map(tx => {
        const cat = allCat.find(c => c.id === tx.category) || { label: tx.category, icon: "tag" };
        return `
        <div class="transaction-item-wrapper" data-id="${tx.id}">
            <div class="transaction-item-bg">
                <button class="tx-action-btn edit-btn" onclick="editTransaction(${tx.id})">
                    <i data-lucide="pencil"></i>
                </button>
                <button class="tx-action-btn delete-btn" onclick="deleteTransaction(${tx.id})">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="transaction-item-content" 
                 ontouchstart="handleTouchStart(event, ${tx.id})" 
                 ontouchmove="handleTouchMove(event, ${tx.id})" 
                 ontouchend="handleTouchEnd(event, ${tx.id})"
                 onmousedown="handleTouchStart(event, ${tx.id})"
                 onmousemove="handleTouchMove(event, ${tx.id})"
                 onmouseup="handleTouchEnd(event, ${tx.id})"
                 onmouseleave="handleTouchEnd(event, ${tx.id})">
                <div class="tx-icon"><i data-lucide="${cat.icon}"></i></div>
                <div class="tx-details">
                    <span class="tx-category">${cat.label}</span>
                    <span class="tx-note">${tx.note || ''}</span>
                </div>
                <div class="tx-amount ${tx.amount < 0 ? 'negative' : 'positive'}">
                    ${fmtMoney(tx.amount)}
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

let touchStartX = 0;
let touchCurrentX = 0;
let swipedItemId = null;

window.handleTouchStart = function(e, id) {
    touchStartX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    touchCurrentX = touchStartX;
    if (swipedItemId && swipedItemId !== id) {
        const prev = document.querySelector(`[data-id='${swipedItemId}']`);
        if(prev) prev.classList.remove('swipe-open');
    }
    swipedItemId = id;
};

window.handleTouchMove = function(e, id) {
    if (swipedItemId !== id) return;
    if (e.type.includes('mouse') && e.buttons !== 1) return; 

    touchCurrentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
};

window.handleTouchEnd = function(e, id) {
    if (swipedItemId !== id) return;
    
    const diff = touchStartX - touchCurrentX;
    const wrapper = document.querySelector(`[data-id='${id}']`);
    if (!wrapper) return;
    
    if (diff > 40) {
        wrapper.classList.add('swipe-open');
    } else if (diff < -40) {
        wrapper.classList.remove('swipe-open');
        swipedItemId = null;
    } else if (e.type === 'mouseleave') {
        wrapper.classList.remove('swipe-open');
        swipedItemId = null;
    }
};

function closeSwipeIfNeeded(e) {
    if (swipedItemId) {
        const wrapper = document.querySelector(`[data-id='${swipedItemId}']`);
        if (wrapper && !wrapper.contains(e.target)) {
            wrapper.classList.remove('swipe-open');
            swipedItemId = null;
        }
    }
}

document.addEventListener('touchstart', closeSwipeIfNeeded);
document.addEventListener('mousedown', closeSwipeIfNeeded);

window.deleteTransaction = function(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveTransactions();
    renderTransactionsForDay(selectedDate);
    updateAccountsData();
    renderCharts();
    updateStreak();
    renderCalendar();
};

window.editTransaction = function(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    editingTxId = id;
    
    document.querySelector('.nav-item.tab-add').click();
    
    const type = tx.amount < 0 ? 'expense' : 'income';
    const typeBtn = document.querySelector(`.type-btn[data-type="${type}"]`);
    if(typeBtn) typeBtn.click();
    
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-amount').value = Math.abs(tx.amount);
    
    setTimeout(() => {
        document.getElementById('tx-category').value = tx.category;
    }, 50);
    
    document.getElementById('tx-note').value = tx.note || '';
    document.getElementById('submit-btn').textContent = t('btn_update') || '更新紀錄';
};
