// Açık/koyu tema anahtarlama mantığı. Tüm sayfalarda (Kartlar, Oyun, İstatistik) ortak kullanılır.

const TEMA_ANAHTARI = 'kelime-kartlari-tema';

export function temaSistemBaslat() {
    const themeToggle = document.getElementById('theme-toggle');
    const toggleSwitch = document.getElementById('toggle-switch');
    const body = document.body;

    function temaDurumunuYukle() {
        const kaydedilmisTema = localStorage.getItem(TEMA_ANAHTARI) || 'light';
        body.setAttribute('data-theme', kaydedilmisTema);
        toggleSwitch.classList.toggle('active', kaydedilmisTema === 'dark');
    }

    function temaDegistir() {
        const mevcutTema = body.getAttribute('data-theme');
        const yeniTema = mevcutTema === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', yeniTema);
        toggleSwitch.classList.toggle('active', yeniTema === 'dark');
        localStorage.setItem(TEMA_ANAHTARI, yeniTema);
    }

    themeToggle.addEventListener('click', temaDegistir);
    temaDurumunuYukle();
}
