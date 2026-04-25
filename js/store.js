window.activeUser = localStorage.getItem('forest_finance_active_user');
const activeUser = window.activeUser;
if (!activeUser && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

window.transactions = [];
window.accounts = [];
window.activeAccountId = localStorage.getItem('forest_finance_active_account_id');
window.chartInstance = null;
window.currentDate = new Date();
window.selectedDate = new Date();
window.editingTxId = null;

// IndexedDB Configuration
const DB_NAME = 'ForestFinanceDB';
const DB_VERSION = 2; // Incremented version for accounts
const STORE_TXS = 'transactions';
const STORE_ACCOUNTS = 'accounts';

// Fallback translation function to prevent crashes if i18n.js fails to load
if (typeof window.t !== 'function') {
    window.t = (key) => key;
}

function getCategoryMap() {
    return {
        expense: [
            { id: "food", label: t("cat_food"), icon: "utensils" },
            { id: "transport", label: t("cat_transport"), icon: "car" },
            { id: "life", label: t("cat_life"), icon: "home" }, 
            { id: "entertainment", label: t("cat_ent"), icon: "film" },
            { id: "learning", label: t("cat_learn"), icon: "book-open" },
            { id: "health", label: t("cat_health"), icon: "heart" }
        ],
        income: [
            { id: "income", label: t("cat_income"), icon: "dollar-sign" }
        ]
    };
}

/**
 * Open IndexedDB and return a promise
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("DB Open Error: " + event.target.errorCode);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_TXS)) {
                const store = db.createObjectStore(STORE_TXS, { keyPath: 'id' });
                store.createIndex('user', 'user', { unique: false });
                store.createIndex('accountId', 'accountId', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
                const store = db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
                store.createIndex('user', 'user', { unique: false });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
    });
}

/**
 * Async Load Data
 */
async function loadAllData() {
    if (!activeUser) return;
    try {
        const db = await openDB();
        
        // Load Accounts
        const accTx = db.transaction(STORE_ACCOUNTS, 'readonly');
        const accStore = accTx.objectStore(STORE_ACCOUNTS);
        const accIndex = accStore.index('user');
        
        window.accounts = await new Promise(resolve => {
            const req = accIndex.getAll(activeUser);
            req.onsuccess = () => resolve(req.result || []);
        });

        // Initialize default account if empty
        if (window.accounts.length === 0) {
            const defaultAcc = { id: Date.now().toString(), user: activeUser, name: '預設錢包', balance: 0, icon: 'wallet' };
            window.accounts.push(defaultAcc);
            window.activeAccountId = defaultAcc.id;
            localStorage.setItem('forest_finance_active_account_id', window.activeAccountId);
            await saveAccounts();
        } else if (!window.activeAccountId) {
            window.activeAccountId = window.accounts[0].id;
            localStorage.setItem('forest_finance_active_account_id', window.activeAccountId);
        }

        // Load Transactions
        const txTx = db.transaction(STORE_TXS, 'readonly');
        const txStore = txTx.objectStore(STORE_TXS);
        const txIndex = txStore.index('user');
        
        window.transactions = await new Promise(resolve => {
            const req = txIndex.getAll(activeUser);
            req.onsuccess = () => resolve(req.result || []);
        });
        
        window.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        window.dispatchEvent(new CustomEvent('transactionsChanged'));
        window.dispatchEvent(new CustomEvent('accountsChanged'));
        
    } catch (e) {
        console.error("DB Load Failed", e);
    }
}

// Backward compatibility or for use in legacy code
async function loadTransactions() { return loadAllData(); }

/**
 * Save Accounts
 */
window.saveAccounts = async function() {
    if (!activeUser) return;
    const db = await openDB();
    const tx = db.transaction(STORE_ACCOUNTS, 'readwrite');
    const store = tx.objectStore(STORE_ACCOUNTS);
    
    // Simple sync: clear and put all
    const index = store.index('user');
    const range = IDBKeyRange.only(activeUser);
    const cursorReq = index.openKeyCursor(range);
    
    cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
        } else {
            window.accounts.forEach(acc => store.put(acc));
            window.dispatchEvent(new CustomEvent('accountsChanged'));
        }
    };
}

/**
 * Save Transactions
 */
window.saveTransactions = async function() {
    if (!activeUser) return;
    const db = await openDB();
    const tx = db.transaction(STORE_TXS, 'readwrite');
    const store = tx.objectStore(STORE_TXS);
    
    const index = store.index('user');
    const range = IDBKeyRange.only(activeUser);
    const cursorReq = index.openKeyCursor(range);
    
    cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
        } else {
            window.transactions.forEach(t => store.put({ ...t, user: activeUser }));
            window.dispatchEvent(new CustomEvent('transactionsChanged'));
        }
    };
}
