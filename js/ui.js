window.updateAccountsData = function() {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;

    transactions.forEach(tx => {
        totalBalance += tx.amount;
        if (tx.amount > 0) totalIncome += tx.amount;
        else totalExpense += Math.abs(tx.amount);
    });

    document.getElementById('acc-total-balance').textContent = fmtMoneyPlain(totalBalance);
    document.getElementById('acc-total-income').textContent = fmtMoneyPlain(totalIncome);
    document.getElementById('acc-total-expense').textContent = fmtMoneyPlain(totalExpense);
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            
            navItems.forEach(n => { n.classList.remove('active'); });
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const targetSec = document.getElementById(targetId);
            if(targetSec) targetSec.classList.add('active');

            if (targetId === 'page-ledger') {
                pageTitle.textContent = t('title_ledger');
                renderCalendar();
                renderTransactionsForDay(selectedDate);
            } else if (targetId === 'page-accounts') {
                pageTitle.textContent = t('title_accounts');
                updateAccountsData();
            } else if (targetId === 'page-add') {
                pageTitle.textContent = t('title_add');
                
                if (e && e.isTrusted) {
                    if (typeof editingTxId !== 'undefined') editingTxId = null;
                    const submitBtn = document.getElementById('submit-btn');
                    if(submitBtn) submitBtn.textContent = t('btn_save');
                    const amt = document.getElementById('tx-amount');
                    if(amt) amt.value = '';
                    const note = document.getElementById('tx-note');
                    if(note) note.value = '';
                }
                
                const yyyy = selectedDate.getFullYear();
                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const dd = String(selectedDate.getDate()).padStart(2, '0');
                document.getElementById('tx-date').value = `${yyyy}-${mm}-${dd}`;
                
            } else if (targetId === 'page-charts') {
                pageTitle.textContent = t('title_charts');
                renderCharts(); 
            } else if (targetId === 'page-forest') {
                pageTitle.textContent = t('title_forest');
            } else if (targetId === 'page-settings') {
                pageTitle.textContent = t('title_settings');
            }
        });
    });
}

function initGlobeSettings() {
    const globeBtn = document.getElementById('globe-btn');
    const modal = document.getElementById('global-setting-modal');
    const closeBtn = document.getElementById('close-globe-modal');
    const applyBtn = document.getElementById('apply-globe-btn');
    const langSelect = document.getElementById('select-lang');
    const currSelect = document.getElementById('select-curr');

    if(!globeBtn) return;

    langSelect.value = userLang;
    currSelect.value = userCurr;

    globeBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    applyBtn.addEventListener('click', () => {
        localStorage.setItem('forest_finance_lang', langSelect.value);
        localStorage.setItem('forest_finance_curr', currSelect.value);
        window.location.reload(); 
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function populateCategories(type) {
    const select = document.getElementById('tx-category');
    if(!select) return;
    const cmap = getCategoryMap();
    select.innerHTML = cmap[type].map(cat => `<option value="${cat.id}">${cat.label}</option>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const type = e.target.getAttribute('data-type');
            document.getElementById('tx-type').value = type;
            populateCategories(type);
            
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.style.backgroundColor = type === 'income' ? 'var(--income)' : 'var(--expense)';
        });
    });

    document.getElementById('tx-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!activeUser) return;

        const type = document.getElementById('tx-type').value; 
        let amountStr = document.getElementById('tx-amount').value;
        let amount = parseFloat(amountStr);
        
        if (isNaN(amount) || amount <= 0) return;
        if (type === 'expense') amount = -amount;

        const category = document.getElementById('tx-category').value;
        const note = document.getElementById('tx-note').value;
        const dateVal = document.getElementById('tx-date').value;

        if (editingTxId) {
            const txIndex = transactions.findIndex(t => t.id === editingTxId);
            if (txIndex !== -1) {
                transactions[txIndex] = {
                    ...transactions[txIndex],
                    category,
                    note,
                    amount,
                    date: dateVal
                };
            }
            editingTxId = null;
            document.getElementById('submit-btn').textContent = t('btn_save');
        } else {
            const newTx = {
                id: Date.now(),
                category,
                note,
                amount,
                date: dateVal,
                accountId: window.activeAccountId
            };
            transactions.push(newTx);
        }

        saveTransactions();
        
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-note').value = '';

        playSubmitEffect();
        updateStreak();
        
        const parts = dateVal.split('-');
        selectedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10)-1, parseInt(parts[2], 10));
        currentDate = new Date(selectedDate);
        
        document.querySelector('.nav-item[data-target="page-ledger"]').click();
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('forest_finance_active_user');
        window.location.href = 'login.html';
    });
});
