/**
 * NetFilmx Internationalization (i18n) Engine
 * Default Language: English ('en')
 * Supported Languages: 'en', 'pl'
 */

(function () {
    const DEFAULT_LANG = 'en';
    const SUPPORTED_LANGS = ['en', 'pl'];
    const COOKIE_NAME = 'nfx_lang';
    const CACHE_KEY_PREFIX = 'nfx_dict_';

    let currentLang = DEFAULT_LANG;
    let translations = {};

    function getCookie(name) {
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    function setCookie(name, value, days = 365) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    }

    function detectLanguage() {
        // 1. Check Cookie
        const cookieLang = getCookie(COOKIE_NAME);
        if (cookieLang && SUPPORTED_LANGS.includes(cookieLang)) {
            return cookieLang;
        }

        // 2. Check localStorage
        try {
            const localLang = localStorage.getItem(COOKIE_NAME);
            if (localLang && SUPPORTED_LANGS.includes(localLang)) {
                return localLang;
            }
        } catch (e) {
            // LocalStorage might be restricted in some iframe contexts
        }

        // Default to English ('en')
        return DEFAULT_LANG;
    }

    async function loadDictionary(lang) {
        try {
            const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + lang);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) { }

        try {
            const response = await fetch(`/locales/${lang}.json?v=${Date.now()}`);
            if (!response.ok) {
                console.warn(`[i18n] Could not load dictionary for '${lang}'. Status: ${response.status}`);
                return {};
            }
            const dict = await response.json();
            try {
                sessionStorage.setItem(CACHE_KEY_PREFIX + lang, JSON.stringify(dict));
            } catch (e) { }
            return dict;
        } catch (err) {
            console.error(`[i18n] Error fetching /locales/${lang}.json:`, err);
            return {};
        }
    }

    function applyTranslations() {
        document.documentElement.lang = currentLang;

        // Translate text elements
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && translations[key]) {
                el.textContent = translations[key];
            }
        });

        // Translate placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && translations[key]) {
                el.placeholder = translations[key];
            }
        });

        // Translate titles / tooltips
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key && translations[key]) {
                el.title = translations[key];
            }
        });

        // Update active class on language toggle buttons
        const plBtns = document.querySelectorAll('#lang-pl-btn, .btn-lang-pl');
        const enBtns = document.querySelectorAll('#lang-en-btn, .btn-lang-en');

        plBtns.forEach(btn => btn.classList.toggle('active', currentLang === 'pl'));
        enBtns.forEach(btn => btn.classList.toggle('active', currentLang === 'en'));
    }

    async function setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) return;
        currentLang = lang;

        // Persist language choice
        setCookie(COOKIE_NAME, lang);
        try {
            localStorage.setItem(COOKIE_NAME, lang);
        } catch (e) { }

        translations = await loadDictionary(lang);
        applyTranslations();
    }

    function initButtons() {
        const plBtns = document.querySelectorAll('#lang-pl-btn, .btn-lang-pl');
        const enBtns = document.querySelectorAll('#lang-en-btn, .btn-lang-en');

        plBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                setLanguage('pl');
            };
        });

        enBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                setLanguage('en');
            };
        });
    }

    // Initialize on DOM ready
    async function init() {
        currentLang = detectLanguage();
        initButtons();
        translations = await loadDictionary(currentLang);
        applyTranslations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose global helper
    window.NetFilmxI18n = {
        setLanguage: setLanguage,
        getCurrentLang: () => currentLang,
        t: (key) => translations[key] || key
    };
})();
