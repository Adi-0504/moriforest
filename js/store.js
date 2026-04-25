/**
 * Forest Finance - Data Store Module
 * Handles all data persistence and global state
 */

// Global App Namespace
window.ForestApp = {
    state: {
        activeUser: localStorage.getItem('forest_finance_active_user'),
        activeAccountId: localStorage.getItem('forest_finance_active_account_id'),
        transactions: [],
        accounts: [],
        currentDate: new Date(),
        selectedDate: new Date(),
        editingTxId: null
    },
    constants: {
        DB_NAME: 'ForestFinanceDB',
        DB_VERSION: 2,
        STORES: {
            TXS: 'transactions',
            ACCOUNTS: 'accounts'
        }
    }
};

// Legacy compatibility (to not break other scripts yet)
window.activeUser = window.ForestApp.state.activeUser;
window.transactions = window.ForestApp.state.transactions;
window.accounts = window.ForestApp.state.accounts;
window.activeAccountId = window.ForestApp.state.activeAccountId;
window.selectedDate = window.ForestApp.state.selectedDate;
window.currentDate = window.ForestApp.state.currentDate;

// Auth Check
if (!window.ForestApp.state.activeUser && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

/**
 * IndexedDB Wrapper
 */
const DB = {
    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(window.ForestApp.constants.DB_NAME, window.ForestApp.constants.DB_VERSION);
            request.onerror = (e) => reject("DB Error: " + e.target.errorCode);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const { STORES } = window.ForestApp.constants;
                if (!db.objectStoreNames.contains(STORES.TXS)) {
                    const s = db.createObjectStore(STORES.TXS, { keyPath: 'id' });
                    s.createIndex('user', 'user', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
                    const s = db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
                    s.createIndex('user', 'user', { unique: false });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
        });
    },

    async getAll(storeName) {
        const db = await this.open();
        return new Promise(resolve => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index('user');
            const req = index.getAll(window.ForestApp.state.activeUser);
            req.onsuccess = () => resolve(req.result || []);
        });
    },

    async sync(storeName, dataArray) {
        const db = await this.open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index('user');
        const range = IDBKeyRange.only(window.ForestApp.state.activeUser);
        
        return new Promise(resolve => {
            const cursorReq = index.openKeyCursor(range);
            cursorReq.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    dataArray.forEach(item => store.put({ ...item, user: window.ForestApp.state.activeUser }));
                    resolve();
                }
            };
        });
    }
};

// Global Data Actions
async function loadAllData() {
    if (!window.ForestApp.state.activeUser) return;
    try {
        const { STORES } = window.ForestApp.constants;
        
        // Load Accounts
        window.ForestApp.state.accounts = await DB.getAll(STORES.ACCOUNTS);
        window.accounts = window.ForestApp.state.accounts; // Sync legacy

        // Initialize default account
        if (window.ForestApp.state.accounts.length === 0) {
            const defaultAcc = { id: Date.now().toString(), name: '預設錢包', balance: 0, icon: 'wallet' };
            window.ForestApp.state.accounts.push(defaultAcc);
            window.ForestApp.state.activeAccountId = defaultAcc.id;
            localStorage.setItem('forest_finance_active_account_id', defaultAcc.id);
            await saveAccounts();
        } else if (!window.ForestApp.state.activeAccountId) {
            window.ForestApp.state.activeAccountId = window.ForestApp.state.accounts[0].id;
        }

        // Load Transactions
        window.ForestApp.state.transactions = await DB.getAll(STORES.TXS);
        window.ForestApp.state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        window.transactions = window.ForestApp.state.transactions; // Sync legacy
        
        window.dispatchEvent(new CustomEvent('transactionsChanged'));
        window.dispatchEvent(new CustomEvent('accountsChanged'));
    } catch (e) {
        console.error("Data loading failed", e);
    }
}

async function saveTransactions() {
    await DB.sync(window.ForestApp.constants.STORES.TXS, window.ForestApp.state.transactions);
    window.dispatchEvent(new CustomEvent('transactionsChanged'));
}

async function saveAccounts() {
    await DB.sync(window.ForestApp.constants.STORES.ACCOUNTS, window.ForestApp.state.accounts);
    window.dispatchEvent(new CustomEvent('accountsChanged'));
}

// Backward compatibility exports
window.loadTransactions = loadAllData;
window.saveTransactions = saveTransactions;
window.saveAccounts = saveAccounts;
window.loadAllData = loadAllData;
