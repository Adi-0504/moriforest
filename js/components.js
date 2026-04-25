const { useState, useReducer, useEffect, useMemo, useCallback, useRef } = React;
const e = React.createElement;

/**
 * Shared Lucide Icon Component
 */
function LucideIcon({ name, style, className }) {
    const spanRef = useRef(null);
    useEffect(() => {
        if (spanRef.current && window.lucide) {
            spanRef.current.innerHTML = `<i data-lucide="${name}"></i>`;
            window.lucide.createIcons({ root: spanRef.current });
            const svg = spanRef.current.querySelector('svg');
            if (svg && style) Object.assign(svg.style, style);
            if (svg && className) svg.setAttribute('class', className);
        }
    }, [name, style, className]);
    return e('span', { ref: spanRef, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } });
}

// --- Utilities ---
const CATEGORY_MAP = {
    "food": ["午餐", "晚餐", "早餐", "吃", "飲料", "飯", "麵", "food", "lunch", "dinner", "餐"],
    "transport": ["搭車", "捷運", "公車", "火車", "高鐵", "車票", "交通", "計程車", "uber", "transport"],
    "life": ["水電", "瓦斯", "房租", "日用品", "超市", "全聯", "life", "rent", "utility", "買"],
    "entertainment": ["電影", "唱歌", "遊戲", "娛樂", "movie", "ktv", "game", "玩"],
    "learning": ["書", "課程", "學習", "book", "course", "學"],
    "health": ["看診", "醫", "藥", "健康", "health", "doctor", "病"]
};

function parseInput(input) {
    if (!input.trim()) return null;
    const amountMatch = input.match(/(\d+(\.\d+)?)/);
    if (!amountMatch) return null;
    const amountStr = amountMatch[0];
    const amount = parseFloat(amountStr);
    const note = input.replace(amountStr, '').trim();
    let category = "life";
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(kw => note.toLowerCase().includes(kw))) {
            category = cat;
            break;
        }
    }
    return { amount, note: note || category, category, date: new Date() };
}

/**
 * Quick Add Component
 */
function QuickAdd() {
    const [budget, setBudget] = useState(parseInt(localStorage.getItem('forest_finance_budget')) || 10000);
    const [inputValue, setInputValue] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudget, setTempBudget] = useState(budget);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        const handleUpdate = () => setLastUpdate(Date.now());
        window.addEventListener('transactionsChanged', handleUpdate);
        window.addEventListener('accountsChanged', handleUpdate);
        return () => {
            window.removeEventListener('transactionsChanged', handleUpdate);
            window.removeEventListener('accountsChanged', handleUpdate);
        };
    }, []);

    const parsedTx = useMemo(() => (inputValue.length < 2 ? null : parseInput(inputValue)), [inputValue]);

    const currentTotalExpense = useMemo(() => {
        const txs = window.transactions || [];
        const now = new Date();
        const thisMonthTxs = txs.filter(tx => {
            const d = new Date(tx.date);
            return tx.accountId === window.activeAccountId && 
                   d.getMonth() === now.getMonth() && 
                   d.getFullYear() === now.getFullYear() && tx.amount < 0;
        });
        return thisMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    }, [lastUpdate]);

    const remainingBudget = budget - currentTotalExpense - (parsedTx ? parsedTx.amount : 0);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && parsedTx && window.activeUser) {
            const newTx = {
                id: Date.now(),
                category: parsedTx.category,
                note: parsedTx.note,
                amount: -Math.abs(parsedTx.amount),
                date: `${parsedTx.date.getFullYear()}-${String(parsedTx.date.getMonth()+1).padStart(2,'0')}-${String(parsedTx.date.getDate()).padStart(2,'0')}`,
                accountId: window.activeAccountId
            };
            window.transactions.push(newTx);
            window.saveTransactions();
            
            ['renderTransactionsForDay', 'updateAccountsData', 'renderCharts', 'updateStreak', 'renderCalendar', 'playSubmitEffect'].forEach(fn => {
                if (window[fn]) window[fn](fn === 'renderTransactionsForDay' ? window.selectedDate : undefined);
            });

            setIsAnimating(true);
            setInputValue('');
            setTimeout(() => setIsAnimating(false), 500);
        }
    };

    return e('div', { className: `form-wrapper quick-add-wrapper ${isAnimating ? 'pulse-anim' : ''}`, style: { marginBottom: '16px', padding: '16px' } },
        e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
            e('h2', { style: { fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' } },
                e(LucideIcon, { name: 'zap', style: { width: '16px', height: '16px', color: '#E1B12C' } }),
                '森林速記'
            ),
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                isEditingBudget ? 
                e('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
                    e('input', { type: 'number', value: tempBudget, onChange: (ev) => setTempBudget(ev.target.value), style: { width: '70px', padding: '4px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)' } }),
                    e('button', { onClick: () => { setBudget(parseInt(tempBudget)||0); localStorage.setItem('forest_finance_budget', tempBudget); setIsEditingBudget(false); }, style: { background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem' } }, 'OK')
                ) :
                e('div', { style: { fontSize: '0.8rem', fontWeight: 600, color: remainingBudget < 0 ? 'var(--expense)' : 'var(--primary)', cursor: 'pointer' }, onClick: () => setIsEditingBudget(true) },
                    `預算餘額: $${remainingBudget.toLocaleString()} `,
                    e(LucideIcon, { name: 'edit-2', style: { width: '10px', height: '10px' } })
                )
            )
        ),
        e('input', { type: 'text', placeholder: '例如: 午餐 120 (按 Enter 儲存)', value: inputValue, onChange: (ev) => setInputValue(ev.target.value), onKeyDown: handleKeyDown, style: { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' } }),
        parsedTx && e('div', { style: { marginTop: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' } },
            e('span', { style: { color: 'var(--text-muted)' } }, '解析:'),
            e('strong', { style: { color: 'var(--text-primary)' } }, parsedTx.note),
            e('span', { style: { color: 'var(--expense)', fontWeight: 'bold' } }, `-$${parsedTx.amount}`),
            e('span', { style: { padding: '2px 8px', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontSize: '0.75rem' } }, parsedTx.category)
        )
    );
}

/**
 * Account Manager Component
 */
function AccountManager() {
    const [localAccounts, setLocalAccounts] = useState(window.accounts || []);
    const [activeId, setActiveId] = useState(window.activeAccountId);

    useEffect(() => {
        const handleUpdate = () => {
            setLocalAccounts([...(window.accounts || [])]);
            setActiveId(window.activeAccountId);
        };
        window.addEventListener('accountsChanged', handleUpdate);
        return () => window.removeEventListener('accountsChanged', handleUpdate);
    }, []);

    const addAccount = async () => {
        const name = prompt("輸入帳戶名稱：", "新帳戶");
        if (name) {
            window.accounts.push({ id: Date.now().toString(), name, balance: 0, icon: 'wallet' });
            await window.saveAccounts();
        }
    };

    const selectAccount = (id) => {
        window.activeAccountId = id;
        localStorage.setItem('forest_finance_active_account_id', id);
        setActiveId(id);
        window.dispatchEvent(new CustomEvent('accountsChanged'));
        if (window.renderTransactionsForDay) window.renderTransactionsForDay(window.selectedDate);
        if (window.updateAccountsData) window.updateAccountsData();
    };

    return e('div', { className: 'account-list' },
        e('h3', { style: { fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' } }, '我的帳戶'),
        localAccounts.map(acc => e('div', { key: acc.id, className: `account-item ${activeId === acc.id ? 'active' : ''}`, onClick: () => selectAccount(acc.id) },
            e('div', { className: 'account-item-icon' }, e(LucideIcon, { name: acc.icon || 'wallet' })),
            e('div', { className: 'account-item-info' },
                e('div', { className: 'account-item-name' }, acc.name),
                e('div', { className: 'account-item-balance' }, activeId === acc.id ? '使用中' : '點擊切換')
            ),
            activeId === acc.id && e(LucideIcon, { name: 'check-circle', style: { color: 'var(--primary)' } })
        )),
        e('button', { className: 'add-account-btn', onClick: addAccount },
            e(LucideIcon, { name: 'plus', style: { width: '16px' } }), ' 新增帳戶'
        )
    );
}

/**
 * Forest Growth Page Component
 */
function ForestPage() {
    const [streak, setStreak] = useState(0);
    const [timeStage, setTimeStage] = useState('morning');

    useEffect(() => {
        const update = () => {
            const countEl = document.getElementById('streak-count');
            if (countEl) setStreak(parseInt(countEl.textContent) || 0);
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 8) setTimeStage('dawn');
            else if (hour >= 8 && hour < 11) setTimeStage('morning');
            else if (hour >= 11 && hour < 16) setTimeStage('noon');
            else if (hour >= 16 && hour < 19) setTimeStage('sunset');
            else setTimeStage('night');
        };
        update();
        window.addEventListener('transactionsChanged', update);
        const interval = setInterval(update, 60000);
        return () => {
            window.removeEventListener('transactionsChanged', update);
            clearInterval(interval);
        };
    }, []);

    const stage = useMemo(() => {
        if (streak >= 7) return { class: 'big-tree', title: '茂盛大樹', desc: '你的習慣像大樹一樣穩固！' };
        if (streak >= 3) return { class: 'sapling', title: '成長小樹', desc: '繼續保持記帳好習慣！' };
        return { class: 'seedling', title: '希望幼苗', desc: '種下希望的種子。' };
    }, [streak]);

    return e('div', { className: `forest-container theme-${timeStage}` },
        e('div', { className: `celestial-body ${timeStage === 'night' ? 'moon' : 'sun'}` }),
        e('div', { className: 'tree-stage-container' },
            e('div', { className: stage.class }, stage.class === 'big-tree' && e('div', { className: 'tree-leaves' }))
        ),
        e('div', { className: 'growth-info' },
            e('div', { className: 'growth-title' }, stage.title),
            e('div', { className: 'growth-desc' }, stage.desc),
            e('div', { style: { marginTop: '12px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 } },
                `連續第 ${streak} 天 | 現在是 ${timeStage === 'night' ? '夜晚' : '白天'}`
            )
        )
    );
}

// --- Render Mounting ---
document.addEventListener('DOMContentLoaded', () => {
    const mounts = [
        { id: 'quick-add-root', component: QuickAdd },
        { id: 'forest-root', component: ForestPage },
        { id: 'account-manager-root', component: AccountManager }
    ];
    
    mounts.forEach(m => {
        const el = document.getElementById(m.id);
        if (el) ReactDOM.createRoot(el).render(e(m.component));
    });
    
    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 100);
});
