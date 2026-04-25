window.renderCharts = function() {
    const ctx = document.getElementById('expenseChart');
    const emptyMsg = document.getElementById('chart-empty-msg');
    if(!ctx) return;

    const expenses = transactions.filter(tx => tx.amount < 0);
    
    if(expenses.length === 0) {
        ctx.style.display = 'none';
        emptyMsg.style.display = 'flex';
        return;
    } else {
        ctx.style.display = 'block';
        emptyMsg.style.display = 'none';
    }

    const categoryTotals = {};
    expenses.forEach(tx => {
        if(!categoryTotals[tx.category]) categoryTotals[tx.category] = 0;
        categoryTotals[tx.category] += Math.abs(tx.amount);
    });

    const cmap = getCategoryMap().expense;
    const labels = [];
    const data = [];
    const bgColors = [
        '#2F6B4F', '#A9C7B3', '#4CAF50', '#81C784', '#388E3C', '#E06B6B', '#1F2A24'
    ];

    Object.keys(categoryTotals).forEach(catId => {
        const matchingCat = cmap.find(c => c.id === catId);
        labels.push(matchingCat ? matchingCat.label : catId);
        data.push(categoryTotals[catId]);
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: "'Nunito', 'Microsoft JhengHei', sans-serif" } }
                }
            }
        }
    });
}
