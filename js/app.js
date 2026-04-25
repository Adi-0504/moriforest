window.addEventListener('DOMContentLoaded', async () => {
    if(!activeUser) return;
    
    translatePage(); 
    initGlobeSettings();
    renderWeekDays();
    lucide.createIcons();
    
    const displayUser = document.getElementById('display-userid');
    if(displayUser) displayUser.textContent = activeUser;

    // Wait for IndexedDB to load transactions
    await loadTransactions();
    
    initNavigation();
    updateStreak();
    
    populateCategories('expense');
    
    renderCalendar();
    renderTransactionsForDay(selectedDate);
});
