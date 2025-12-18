// Router для GitHub Pages SPA
class Router {
    constructor() {
        this.routes = {
            '': 'accises',
            'accises': 'accises',
            'dispatchers': 'dispatchers',
            'sroki': 'sroki',
            'history': 'history',
            'gih': 'gih',
            'emptied': 'emptied',
            'calculator': 'calculator',
            'learning': 'learning',
            'settings': 'settings'
        };
        
        this.currentRoute = '';
        this.mobileMenuInitialized = false;
        this.init();
    }
    
    init() {
        // Обработка начального маршрута
        window.addEventListener('DOMContentLoaded', () => {
            this.handleRoute();
        });
        
        // Обработка изменений URL (назад/вперед)
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        
        // Перехват кликов по навигации
        document.addEventListener('click', (e) => {
            // Обработка навигационных элементов
            const navItem = e.target.closest('[data-tab]');
            if (navItem) {
                e.preventDefault();
                const route = navItem.getAttribute('data-tab');
                this.navigate(route);
            }
            
            // Обработка ссылок с data-route
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });
    }
    
    getRouteFromPath() {
        const path = window.location.pathname;
        const hash = window.location.hash.replace('#', '');
        
        // Если есть hash, используем его
        if (hash && this.routes[hash]) {
            return this.routes[hash];
        }
        
        // Иначе парсим путь
        const pathParts = path.split('/').filter(p => p && p !== 'minibars');
        const route = pathParts[pathParts.length - 1] || '';
        
        // Убираем расширение .html если есть
        const cleanRoute = route.replace('.html', '');
        return this.routes[cleanRoute] || this.routes[''];
    }
    
    navigate(route) {
        const normalizedRoute = this.routes[route] || this.routes[''];
        
        // Определяем базовый путь
        const basePath = window.location.pathname.includes('/minibars/') ? '/minibars' : '';
        const newPath = basePath + (normalizedRoute === 'accises' ? '/' : `/${normalizedRoute}`);
        
        // Обновляем URL без перезагрузки страницы
        window.history.pushState({ route: normalizedRoute }, '', newPath);
        
        // Загружаем страницу
        this.loadPage(normalizedRoute);
    }
    
    handleRoute() {
        const route = this.getRouteFromPath();
        this.loadPage(route);
    }
    
    async loadPage(route) {
        if (this.currentRoute === route) return;
        
        this.currentRoute = route;
        
        try {
            // Определяем базовый путь для загрузки файлов
            const basePath = window.location.pathname.includes('/minibars/') ? '/minibars' : '';
            
            // Загружаем HTML страницы
            const response = await fetch(`${basePath}/pages/${route}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${route}.html`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Находим контейнер для контента
            const contentContainer = document.getElementById('page-content');
            if (!contentContainer) {
                console.error('Content container not found');
                return;
            }
            
            // Заменяем контент
            const pageContent = doc.querySelector('.page-content');
            if (pageContent) {
                contentContainer.innerHTML = pageContent.innerHTML;
            } else {
                contentContainer.innerHTML = doc.body.innerHTML;
            }
            
            // Инициализируем мобильное меню после загрузки страницы
            this.initMobileMenu();
            
            // Загружаем скрипт страницы
            const script = document.createElement('script');
            script.src = `${basePath}/js/${route}.js`;
            script.onload = () => {
                // Вызываем инициализацию страницы если есть
                if (window[`init${route.charAt(0).toUpperCase() + route.slice(1)}`]) {
                    window[`init${route.charAt(0).toUpperCase() + route.slice(1)}`]();
                }
            };
            script.onerror = () => {
                console.warn(`Script ${route}.js not found, skipping...`);
            };
            
            // Удаляем старый скрипт если есть
            const oldScript = document.querySelector(`script[data-page="${route}"]`);
            if (oldScript) {
                oldScript.remove();
            }
            
            script.setAttribute('data-page', route);
            document.body.appendChild(script);
            
            // Обновляем активную вкладку в навигации
            this.updateNavigation(route);
            
            // Обновляем заголовок страницы
            const titles = {
                'accises': 'Акцизы',
                'dispatchers': 'Депатчеры',
                'sroki': 'Сроки',
                'history': 'История',
                'gih': 'GIH',
                'emptied': 'Пустые',
                'calculator': 'Калькулятор',
                'learning': 'Обучение',
                'settings': 'Настройки'
            };
            
            document.title = `${titles[route] || 'Минибары'} - Минибары`;
            
        } catch (error) {
            console.error('Error loading page:', error);
            // Fallback на главную страницу
            if (route !== 'accises') {
                this.navigate('accises');
            }
        }
    }
    
    updateNavigation(route) {
        // Обновляем активные классы в навигации
        document.querySelectorAll('.nav-item, .b-item, .mb-burger-item').forEach(item => {
            const itemRoute = item.getAttribute('data-tab') || item.getAttribute('data-route');
            if (itemRoute === route) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    initMobileMenu() {
        // Инициализация мобильного меню (только один раз)
        if (this.mobileMenuInitialized) return;
        
        const burgerBtn = document.getElementById('mbBurgerBtn');
        const burgerMenu = document.getElementById('mbBurgerMenu');
        
        if (burgerBtn && burgerMenu) {
            // Удаляем старые обработчики если есть
            const newBurgerBtn = burgerBtn.cloneNode(true);
            burgerBtn.parentNode.replaceChild(newBurgerBtn, burgerBtn);
            
            newBurgerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                burgerMenu.classList.toggle('show');
            });
            
            // Закрытие меню при клике вне его
            const closeMenu = (e) => {
                if (!burgerMenu.contains(e.target) && !newBurgerBtn.contains(e.target)) {
                    burgerMenu.classList.remove('show');
                }
            };
            
            document.addEventListener('click', closeMenu);
            this.mobileMenuInitialized = true;
        }
    }
}

// Инициализируем роутер
const router = new Router();

// Экспортируем для использования в других скриптах
window.router = router;

