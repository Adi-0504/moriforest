const { useState, useReducer, useEffect, useMemo, useCallback } = React;

// Custom Hook for debounce
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// Category keyword mapping
const CATEGORY_MAP = {
    "food": ["午餐", "晚餐", "早餐", "吃", "飲料", "飯", "麵", "food", "lunch", "dinner", "餐", "吃"],
    "transport": ["搭車", "捷運", "公車", "火車", "高鐵", "車票", "交通", "計程車", "uber", "transport", "bus", "train", "mrt"],
    "life": ["水電", "瓦斯", "房租", "日用品", "超市", "全聯", "life", "rent", "utility", "買"],
    "entertainment": ["電影", "唱歌", "遊戲", "娛樂", "movie", "ktv", "game", "玩"],
    "learning": ["書", "課程", "學習", "book", "course", "學"],
    "health": ["看診", "醫", "藥", "健康", "health", "doctor", "病"]
};

// Parser function (input to transaction) using regex
function parseInput(input) {
    if (!input.trim()) return null;
    
    // Regex to match the amount (any number, positive or negative)
    const amountMatch = input.match(/(\d+(\.\d+)?)/);
    if (!amountMatch) return null;
    
    const amountStr = amountMatch[0];
    const amount = parseFloat(amountStr);
    
    // Remove amount from input to get the text note
    const note = input.replace(amountStr, '').trim();
    
    // Determine category by matching keywords
    let category = "life"; 
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(kw => note.toLowerCase().includes(kw))) {
            category = cat;
            break;
        }
    }

    return {
        amount,
        note: note || category, // fallback note if empty
        category,
        date: new Date() // Date API
    };
}

// Initial state for Reducer (handling Budget from localStorage)
const initialState = {
    budget: parseInt(localStorage.getItem('forest_finance_budget')) || 10000,
};

function budgetReducer(state, action) {
    switch (action.type) {
        case 'SET_BUDGET':
            localStorage.setItem('forest_finance_budget', action.payload);
            return { ...state, budget: action.payload };
        default:
            return state;
    }
}

function QuickAdd() {
    const [state, dispatch] = useReducer(budgetReducer, initialState);
    const [inputValue, setInputValue] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Debounce the input for real-time parsing without lagging
    const debouncedInput = useDebounce(inputValue, 300);

    // Memoize the parsed result
    const parsedTx = useMemo(() => parseInput(debouncedInput), [debouncedInput]);

    // Budget Calculation (Memoized)
    // We calculate the current month's expenses from global transactions array
    const currentTotalExpense = useMemo(() => {
        const txs = window.transactions || [];
        const now = new Date();
        const thisMonthTxs = txs.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === now.getMonth() && 
                   d.getFullYear() === now.getFullYear() && 
                   tx.amount < 0;
        });
        return thisMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    }, [window.transactions, isAnimating]); // Re-run when animation state changes (proxy for submit)

    const remainingBudget = state.budget - currentTotalExpense - (parsedTx ? parsedTx.amount : 0);

    // input + onkeydown 即時State更新
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (parsedTx && window.activeUser) {
                // Generate transaction from parsed data
                const newTx = {
                    id: Date.now(),
                    category: parsedTx.category,
                    note: parsedTx.note,
                    amount: -Math.abs(parsedTx.amount), 
                    // Format Date API to string for the app
                    date: `${parsedTx.date.getFullYear()}-${String(parsedTx.date.getMonth()+1).padStart(2,'0')}-${String(parsedTx.date.getDate()).padStart(2,'0')}`,
                    accountId: window.activeAccountId
                };
                
                // Interact with vanilla JS globals
                window.transactions.push(newTx);
                window.saveTransactions();
                
                // Trigger vanilla UI updates
                if (window.renderTransactionsForDay) window.renderTransactionsForDay(window.selectedDate);
                if (window.updateAccountsData) window.updateAccountsData();
                if (window.renderCharts) window.renderCharts();
                if (window.updateStreak) window.updateStreak();
                if (window.renderCalendar) window.renderCalendar();
                
                // Trigger Animation
                setIsAnimating(true);
                if (window.playSubmitEffect) window.playSubmitEffect();
                
                // Clear input
                setInputValue('');
                setTimeout(() => setIsAnimating(false), 500);
            }
        }
    };

    return (
        <div className={`form-wrapper quick-add-wrapper ${isAnimating ? 'pulse-anim' : ''}`} style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i data-lucide="zap" style={{ width: '16px', height: '16px', color: '#E1B12C' }}></i>
                    閃電記帳
                </h2>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: remainingBudget < 0 ? 'var(--expense)' : 'var(--primary)' }}>
                    預算餘額: ${remainingBudget.toLocaleString()}
                </div>
            </div>
            
            <input 
                type="text" 
                placeholder="例如: 午餐 120 (按 Enter 儲存)" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none',
                    backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)'
                }}
            />
            
            {parsedTx && (
                <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>解析結果:</span>
                    <strong style={{color:'var(--text-primary)'}}>{parsedTx.note}</strong> 
                    <span style={{color:'var(--expense)', fontWeight: 'bold'}}>-${parsedTx.amount}</span>
                    <span style={{padding: '2px 8px', background:'var(--primary)', color: 'white', borderRadius:'8px', fontSize:'0.75rem'}}>
                        {parsedTx.category}
                    </span>
                    <span style={{color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 'auto'}}>⏎ Enter</span>
                </div>
            )}
        </div>
    );
}

// Render React component into the DOM
const rootContainer = document.getElementById('quick-add-root');
if (rootContainer) {
    const root = ReactDOM.createRoot(rootContainer);
    root.render(<QuickAdd />);
    
    // Re-initialize icons for dynamically added react content
    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 100);
}
