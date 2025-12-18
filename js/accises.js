// Инициализация страницы Акцизы
function initAccises() {
    console.log('Инициализация страницы Акцизы');
    
    // Загрузка данных из localStorage
    if (typeof appData !== 'undefined') {
        renderAccises();
        setupAccisesListeners();
    }
}

function renderAccises() {
    const accisesList = $('#accises-list');
    if (!accisesList) return;
    
    accisesList.innerHTML = '';
    const accises = appData.accises || [];
    
    accises.forEach((accise, index) => {
        renderAcciseItem(accise, index);
    });
    
    updateAcciseStats();
}

function renderAcciseItem(accise, index) {
    const accisesList = $('#accises-list');
    if (!accisesList) return;
    
    const item = document.createElement('div');
    item.className = 'accise-item';
    item.style.cssText = 'padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid rgba(15,23,36,0.1); display:flex; justify-content:space-between; align-items:center;';
    
    const isValid = accise && accise.length === 13 && /^\d+$/.test(accise);
    if (isValid) {
        item.classList.add('valid');
    } else {
        item.classList.add('invalid');
    }
    
    item.innerHTML = `
        <span>${accise || ''}</span>
        <button class="btn ghost small" onclick="removeAccise(${index})" title="Удалить">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    accisesList.insertBefore(item, accisesList.firstChild);
}

function updateAcciseStats() {
    const totalEl = $('#total-accises');
    const charsEl = $('#total-chars');
    
    if (totalEl) {
        const validAccises = (appData.accises || []).filter(a => a && a.length === 13 && /^\d+$/.test(a));
        totalEl.textContent = validAccises.length;
    }
    
    if (charsEl) {
        const allChars = (appData.accises || []).join('').length;
        charsEl.textContent = allChars;
    }
}

function removeAccise(index) {
    appData.accises.splice(index, 1);
    saveToFirebase();
    renderAccises();
}

function setupAccisesListeners() {
    const newAcciseInput = $('#new-accise');
    const newAcciseMobile = $('#new-accise-mobile');
    const copyBtn = $('#copy-accises');
    
    const handleInput = (input) => {
        if (!input) return;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value.trim();
                if (value) {
                    if (!appData.accises) appData.accises = [];
                    appData.accises.unshift(value);
                    saveToFirebase();
                    renderAccises();
                    input.value = '';
                }
            }
        });
    };
    
    handleInput(newAcciseInput);
    handleInput(newAcciseMobile);
    
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const validAccises = (appData.accises || []).filter(a => a && a.length === 13 && /^\d+$/.test(a));
            const text = validAccises.join('\n');
            copyText(text);
        });
    }
}

// Автоматическая инициализация при загрузке страницы
// Глобальные функции для вызова из common.js
window.renderAccises = renderAccises;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccises);
} else {
    initAccises();
}


