import { kelimeler } from "./kelimelerOkunuslu.js";

const tumKelimeler = kelimeler;


const SVG_STAR_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`;
const SVG_STAR_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z"/></svg>`;


// Oyun durumu değişkenleri
let mevcutBolum = 1;
let mevcutKelimeler = [];
let kullaniciKelimeleri = []; // Kullanıcının yüklediği kelimeler (Favoriler)
let mevcutKelimeIndex = 0;
let kartDurumu = "ingilizce";
let bilmiyorumListesi = [];
let ogrenilenler = [];
let aktifKelimeler = [];
let animasyonDevamEdiyor = false;

// DOM elementleri
const card = document.getElementById('card');
const cardText = document.getElementById('card_text');
const biliyorumBtn = document.getElementById('biliyorumBtn');
const bilmiyorumBtn = document.getElementById('bilmiyorumBtn');
const ilerlemeTxt = document.getElementById('ilerleme-text');
const themeToggle = document.getElementById('theme-toggle');
const toggleSwitch = document.getElementById('toggle-switch');
const body = document.body;
const kelimeYukleBtn = document.getElementById('kelime-yukle-btn');
const kelimeYuklePanel = document.getElementById('kelime-yukle-panel');
const kelimeTextarea = document.getElementById('kelime-textarea');
const kelimeSayisiDiv = document.getElementById('kelime-sayisi');
const btnYukle = document.getElementById('btn-yukle');
const btnTemizle = document.getElementById('btn-temizle');
const btnKapat = document.getElementById('btn-kapat');
const favlama = document.getElementById("favlama");
const okunusTxt = document.getElementById("card_pronunciation");

const bolumBtnlari = [
    document.getElementById('btn-1'),
    document.getElementById('btn-2'),
    document.getElementById('btn-3'),
    document.getElementById('btn-4'),
    document.getElementById('btn-5'),
    document.getElementById('btn-6')
];

function kelimeleriAyir() {
    const bolumler = [];
    const kelimePerBolum = 200;
    for (let i = 0; i < 5; i++) {
        const baslangic = i * kelimePerBolum;
        const bitis = Math.min(baslangic + kelimePerBolum, tumKelimeler.length);
        const bolumKelimeleri = tumKelimeler.slice(baslangic, bitis);
        if (bolumKelimeleri.length > 0) {
            bolumler.push(bolumKelimeleri);
        }
    }
    return bolumler;
}

const bolumler = kelimeleriAyir();

document.addEventListener('DOMContentLoaded', function () {
    eventListenerlarEkle();
    temaDurumunuYukle();
    kullaniciKelimeleriniYukle();
    bolumDegistir(1);
});

function eventListenerlarEkle() {
    favlama.addEventListener('click', favoriDurumunuDegistir); // <-- DÜZENLENDİ
    card.addEventListener('click', kartiCevir);
    themeToggle.addEventListener('click', temaDegistir);
    bolumBtnlari.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            bolumDegistir(index + 1);
        });
    });
    kelimeYukleBtn.addEventListener('click', kelimeYuklePaneliniAc);
    btnKapat.addEventListener('click', kelimeYuklePaneliniKapat);
    btnYukle.addEventListener('click', kelimeleriYukle);
    btnTemizle.addEventListener('click', kelimeleriTemizle);
    kelimeTextarea.addEventListener('input', kelimeOnizlemesiniGuncelle);
    biliyorumBtn.addEventListener('click', function () {
        if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;
        kartAnimasyonu('right');
        setTimeout(() => {
            biliyorumIsle();
        }, 300);
    });
    bilmiyorumBtn.addEventListener('click', function () {
        if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;
        kartAnimasyonu('left');
        setTimeout(() => {
            bilmiyorumIsle();
        }, 300);
    });
    document.addEventListener('keydown', function (e) {
        if (animasyonDevamEdiyor) return;
        if (kelimeYuklePanel.classList.contains('show')) return;
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            biliyorumBtn.click();
        } else if (e.key === 'ArrowLeft' || e.key === ' ') {
            e.preventDefault();
            bilmiyorumBtn.click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            kartiCevir();
        }
    });
}

function bolumDegistir(bolumNo) {
    mevcutBolum = bolumNo;
    bolumBtnlari.forEach((btn, index) => {
        btn.classList.toggle('active', index + 1 === bolumNo);
    });
    if (bolumNo === 6) {
        if (kullaniciKelimeleri.length === 0) {
            alert('Favori kelime listeniz boş. Kartların üzerindeki yıldız ikonuna basarak favori ekleyebilirsiniz.');
            cardText.textContent = 'Favori kelime listeniz boş';
            mevcutKelimeler = [];
            oyunuSifirla();
            return;
        }
        mevcutKelimeler = [...kullaniciKelimeleri];
    } else {
        if (bolumNo > bolumler.length) {
            cardText.textContent = `Bölüm ${bolumNo} için kelime bulunamadı`;
            mevcutKelimeler = [];
            oyunuSifirla();
            return;
        }
        mevcutKelimeler = [...bolumler[bolumNo - 1]];
    }
    oyunuSifirla();
}

function oyunuSifirla() {
    mevcutKelimeIndex = 0;
    kartDurumu = "ingilizce";
    bilmiyorumListesi = [];
    ogrenilenler = [];
    aktifKelimeler = [...mevcutKelimeler];
    biliyorumBtn.style.display = 'inline-block';
    bilmiyorumBtn.style.display = 'inline-block';
    favlama.style.display = 'block';
    if (aktifKelimeler.length > 0) {
        kelimeleriKaristir();
        ilkKelimeyiGoster();
    } else {
        oyunBitti();
    }
    ilerlemeyiGuncelle();
}


function ilkKelimeyiGoster() {
    if (aktifKelimeler.length > 0) {
        const kelime = aktifKelimeler[mevcutKelimeIndex];
        kartDurumu = "ingilizce";
        cardText.textContent = kelime.ingilizce;
        okunusTxt.textContent = kelime.okunus || '';
        kartRenginiSifirla();
        ilerlemeyiGuncelle();
        favoriIkonunuGuncelle(); 
    } else {
        oyunBitti();
    }
}

function kartiCevir() {
    if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;
    animasyonDevamEdiyor = true;
    card.classList.add('flipping');
    setTimeout(() => {
        if (kartDurumu === "ingilizce") {
            kartDurumu = "turkce";
            cardText.textContent = aktifKelimeler[mevcutKelimeIndex].turkce;
            okunusTxt.textContent = '';
        } else {
            kartDurumu = "ingilizce";
            cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
            okunusTxt.textContent = aktifKelimeler[mevcutKelimeIndex].okunus || '';

        }
    }, 300);
    setTimeout(() => {
        card.classList.remove('flipping');
        animasyonDevamEdiyor = false;
    }, 600);
}

function kartAnimasyonu(yon) {
    animasyonDevamEdiyor = true;
    card.classList.add(yon);
    setTimeout(() => {
        card.classList.remove(yon);
        kartRenginiSifirla();
        animasyonDevamEdiyor = false;
    }, 600);
}

function kartRenginiSifirla() {
    card.style.background = '';
    card.style.transform = '';
}

function biliyorumIsle() {
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    if (!ogrenilenler.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        ogrenilenler.push(mevcutKelime);
    }
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    sonrakiKelime();
}

function bilmiyorumIsle() {
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    if (!bilmiyorumListesi.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        bilmiyorumListesi.push(mevcutKelime);
    }
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    aktifKelimeler.push(mevcutKelime);
    sonrakiKelime();
}

function sonrakiKelime() {
    ilerlemeyiGuncelle();
    if (aktifKelimeler.length === 0) {
        oyunBitti();
        return;
    }
    if (mevcutKelimeIndex >= aktifKelimeler.length) {
        mevcutKelimeIndex = 0;
    }
    const kelime = aktifKelimeler[mevcutKelimeIndex];
    kartDurumu = "ingilizce";
    cardText.textContent = kelime.ingilizce;
    okunusTxt.textContent = kelime.okunus || '';
    favoriIkonunuGuncelle(); 
}

function ilerlemeyiGuncelle() {
    const toplamKelime = mevcutKelimeler.length;
    const ogrenilenSayi = ogrenilenler.length;
    const yuzde = toplamKelime > 0 ? Math.round((ogrenilenSayi / toplamKelime) * 100) : 0;
    const bolumAdi = mevcutBolum === 6 ? 'Favoriler' : `Bölüm ${mevcutBolum}`;
    ilerlemeTxt.textContent = `İlerleme: %${yuzde} (${ogrenilenSayi}/${toplamKelime}) - ${bolumAdi}`;
}

function oyunBitti() {
    favlama.style.display = 'none'; 
    const toplamKelime = mevcutKelimeler.length;
    if (toplamKelime === 0 && mevcutBolum !== 6) {
        cardText.innerHTML = `Bu bölümde kelime bulunmuyor.`;
        biliyorumBtn.style.display = 'none';
        bilmiyorumBtn.style.display = 'none';
        return;
    }
    const bolumAdi = mevcutBolum === 6 ? 'Favori Kelimeleriniz' : `Bölüm ${mevcutBolum}`;
    okunusTxt.textContent = '';
    cardText.innerHTML = `
        <div class="finish-container">
            <h3>🎉 Tebrikler!</h3>
            <p>${bolumAdi} tamamlandı!</p>
            <small>Öğrenilen: ${ogrenilenler.length}/${toplamKelime} kelime</small>
            <br>
            <button onclick="oyunuYenidenBaslat()" class="btn-restart mt-3">
                Yeniden Başla
            </button>
        </div>
    `;
    biliyorumBtn.style.display = 'none';
    bilmiyorumBtn.style.display = 'none';
}

function oyunuYenidenBaslat() {
    console.log('Oyunu yeniden başlatılıyor...');
    oyunuSifirla();
}


function kelimeleriKaristir() {
     for (let i = aktifKelimeler.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [aktifKelimeler[i], aktifKelimeler[j]] = [aktifKelimeler[j], aktifKelimeler[i]];
     }
}

function kelimeYuklePaneliniAc() {
    kelimeYuklePanel.classList.add('show');
    kelimeOnizlemesiniGuncelle();
}

function kelimeYuklePaneliniKapat() {
    kelimeYuklePanel.classList.remove('show');
}

function kelimeOnizlemesiniGuncelle() {
    const metin = kelimeTextarea.value.trim();
    if (!metin) {
        kelimeSayisiDiv.textContent = 'Henüz kelime eklenmedi';
        kelimeSayisiDiv.className = 'kelime-sayisi';
        return;
    }
    const satirlar = metin.split('\n').filter(satir => satir.trim());
    let gecerliSayi = 0;
    satirlar.forEach(satir => {
        const parcalar = satir.split(',');
        if (parcalar.length >= 2 && parcalar[0].trim() && parcalar[1].trim()) {
            gecerliSayi++;
        }
    });
    if (gecerliSayi > 0) {
        kelimeSayisiDiv.textContent = `${gecerliSayi} geçerli kelime bulundu`;
        kelimeSayisiDiv.className = 'kelime-sayisi success';
    } else {
        kelimeSayisiDiv.textContent = 'Geçerli formatta kelime bulunamadı';
        kelimeSayisiDiv.className = 'kelime-sayisi error';
    }
}

function kelimeleriYukle() {
    const metin = kelimeTextarea.value.trim();
    if (!metin) {
        alert('Lütfen önce kelime girin!');
        return;
    }
    const satirlar = metin.split('\n').filter(satir => satir.trim());
    const yeniKelimeler = [];
    satirlar.forEach(satir => {
        const temizSatir = satir.trim();
        if (temizSatir && temizSatir.includes(',')) {
            const parcalar = temizSatir.split(',');
            if (parcalar.length >= 2 && parcalar[0].trim() && parcalar[1].trim()) {
                yeniKelimeler.push({
                    ingilizce: parcalar[0].trim(),
                    turkce: parcalar[1].trim()
                });
            }
        }
    });
    if (yeniKelimeler.length === 0) {
        alert('Geçerli kelime bulunamadı! Format: ingilizce,turkce');
        return;
    }
    kullaniciKelimeleri = [...yeniKelimeler];
    kullaniciKelimeleriniGuncelle(); // Kaydet ve textarea'yı güncelle
    alert(`${yeniKelimeler.length} kelime başarıyla yüklendi!`);
    kelimeYuklePaneliniKapat();
    if (mevcutBolum === 6) {
        bolumDegistir(6);
    }
}


function favoriDurumunuDegistir() {
    if (!aktifKelimeler || aktifKelimeler.length === 0) return;

    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];

    // Kelimenin favorilerde olup olmadığını kontrol et
    const favoriIndex = kullaniciKelimeleri.findIndex(k => k.ingilizce === mevcutKelime.ingilizce);

    if (favoriIndex > -1) {
        // Eğer varsa, favorilerden çıkar
        kullaniciKelimeleri.splice(favoriIndex, 1);
        favlama.innerHTML = SVG_STAR_EMPTY; // İkonu boş yap
    } else {
        // Eğer yoksa, favorilere ekle
        kullaniciKelimeleri.push(mevcutKelime);
        favlama.innerHTML = SVG_STAR_FILLED; // İkonu dolu yap
    }

    kullaniciKelimeleriniGuncelle(); // Değişiklikleri kaydet ve textarea'yı güncelle
}


function favoriIkonunuGuncelle() {
    if (!aktifKelimeler || aktifKelimeler.length === 0) {
        favlama.innerHTML = SVG_STAR_EMPTY;
        return;
    }
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    const favoriMi = kullaniciKelimeleri.some(k => k.ingilizce === mevcutKelime.ingilizce);

    if (favoriMi) {
        favlama.innerHTML = SVG_STAR_FILLED;
    } else {
        favlama.innerHTML = SVG_STAR_EMPTY;
    }
}


function kelimeleriTemizle() {
    if (confirm('Tüm özel/favori kelimeleriniz silinecek. Emin misiniz?')) {
        kullaniciKelimeleri = [];
        kullaniciKelimeleriniGuncelle();
        alert('Tüm özel kelimeler silindi.');
        if (mevcutBolum === 6) {
            bolumDegistir(1);
        }
    }
}

// --- YENİ YARDIMCI FONKSİYON: Kaydetme ve Textarea Güncelleme ---
function kullaniciKelimeleriniGuncelle() {
    try {
        // 1. localStorage'a kaydet
        localStorage.setItem('kelime-kartlari-ozel-kelimeler', JSON.stringify(kullaniciKelimeleri));
        
        // 2. Textarea'yı güncelle
        const kelimeMetni = kullaniciKelimeleri.map(k => `${k.ingilizce},${k.turkce}`).join('\n');
        kelimeTextarea.value = kelimeMetni;

        // 3. Kelime sayısını da güncelle
        kelimeOnizlemesiniGuncelle();
    } catch (e) {
        console.warn('Kelimeler kaydedilemedi:', e);
    }
}

function kullaniciKelimeleriniYukle() {
    try {
        const kaydedilmisList = localStorage.getItem('kelime-kartlari-ozel-kelimeler');
        if (kaydedilmisList) {
            kullaniciKelimeleri = JSON.parse(kaydedilmisList);
            const kelimeMetni = kullaniciKelimeleri.map(k => `${k.ingilizce},${k.turkce}`).join('\n');
            kelimeTextarea.value = kelimeMetni;
        }
    } catch (e) {
        console.warn('Kelimeler yüklenemedi:', e);
        kullaniciKelimeleri = [];
    }
}

















// ==========================================
// YAPAY ZEKA (AI) MODÜLÜ
// ==========================================

const aiPanel = document.getElementById('ai-panel');
const gameElements = [
    document.querySelector('.card-container'),
    document.querySelector('.actions'), // Butonlar ve yıldız
    document.querySelector('.kelimePaneli'), // Bölüm butonları
    document.getElementById('ilerleme')
];
const navAiBtn = document.getElementById('nav-ai-mode');
const navGameBtn = document.getElementById('nav-game-mode');
const aiWordListDiv = document.getElementById('ai-word-list');
const btnGenerateStory = document.getElementById('btn-generate-story');
const selectAllCheckbox = document.getElementById('select-all-words');
const apiKeyInput = document.getElementById('api-key-input');

// API Key'i LocalStorage'dan yükle
if(localStorage.getItem('gemini-api-key')) {
    apiKeyInput.value = localStorage.getItem('gemini-api-key');
}

// Event Listeners - Mod Geçişleri
navAiBtn.addEventListener('click', () => {
    modDegistir('ai');
    favoriKelimeleriListeleUI();
});

navGameBtn.addEventListener('click', () => {
    modDegistir('game');
});

// Event Listener - Tümünü Seç
selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.kelime-secim-cb');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// Event Listener - Hikaye Oluştur
btnGenerateStory.addEventListener('click', hikayeOlustur);

// API Key Kaydetme
apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('gemini-api-key', apiKeyInput.value.trim());
});

function modDegistir(mod) {
    if (mod === 'ai') {
        // Oyunu gizle, AI panelini aç
        gameElements.forEach(el => el && el.classList.add('d-none'));
        aiPanel.classList.remove('d-none');
        navAiBtn.classList.add('d-none');
        navGameBtn.classList.remove('d-none');
    } else {
        // AI panelini gizle, oyunu aç
        gameElements.forEach(el => el && el.classList.remove('d-none'));
        aiPanel.classList.add('d-none');
        navAiBtn.classList.remove('d-none');
        navGameBtn.classList.add('d-none');
    }
}

function favoriKelimeleriListeleUI() {
    aiWordListDiv.innerHTML = '';
    
    if (kullaniciKelimeleri.length === 0) {
        aiWordListDiv.innerHTML = '<span class="text-danger">Listenizde hiç favori kelime yok. Lütfen önce kartlardan yıldız ikonuna basarak kelime ekleyin.</span>';
        btnGenerateStory.disabled = true;
        return;
    }

    btnGenerateStory.disabled = false;
    
    kullaniciKelimeleri.forEach((kelime, index) => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input kelime-secim-cb" type="checkbox" value="${kelime.ingilizce}" id="ai-cb-${index}" checked>
            <label class="form-check-label" for="ai-cb-${index}">
                ${kelime.ingilizce} <small class="text-muted">(${kelime.turkce})</small>
            </label>
        `;
        aiWordListDiv.appendChild(div);
    });
}

async function hikayeOlustur() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Lütfen bir Google Gemini API anahtarı girin!");
        return;
    }

    // Seçili kelimeleri al
    const secilenKelimeler = Array.from(document.querySelectorAll('.kelime-secim-cb:checked')).map(cb => cb.value);
    const seviye = document.getElementById('story-level').value;
    const konu = document.getElementById('story-topic').value || "Genel bir konu";

    if (secilenKelimeler.length === 0) {
        alert("Lütfen en az bir kelime seçin!");
        return;
    }

    // UI Yükleniyor durumu
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const storyResult = document.getElementById('story-result');
    const storyContent = document.getElementById('story-content');
    const storyTranslation = document.getElementById('story-translation');

    btnGenerateStory.disabled = true;
    btnText.textContent = "Yazılıyor...";
    btnLoading.classList.remove('d-none');
    storyResult.classList.add('d-none');

    // Prompt Hazırlama
    const prompt = `
        Sen uzman bir İngilizce öğretmenisin.
        Görev: Aşağıdaki kelimeleri kullanarak kısa bir hikaye yaz.
        
        Parametreler:
        - Hedef Seviye: ${seviye} (CEFR Standartlarına uygun olsun)
        - Konu: ${konu}
        - Kullanılacak Kelimeler: ${secilenKelimeler.join(', ')}
        
        Çıktı Formatı (JSON Olarak ver):
        {
            "story": "İngilizce hikaye metni buraya. Hikaye içinde geçen 'Kullanılacak Kelimeler' listesindeki kelimeleri mutlaka <strong> etiketi içine alarak kalınlaştır (Örn: <strong>word</strong>).",
            "translation": "Hikayenin Türkçe çevirisi veya geniş özeti buraya."
        }
        Lütfen sadece saf JSON döndür, markdown bloğu kullanma.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        // Gemini cevabını işle
        let textResponse = data.candidates[0].content.parts[0].text;
        
        // JSON temizliği (Bazen markdown ```json ... ``` içinde dönebilir)
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const jsonResponse = JSON.parse(textResponse);

        // Sonucu Ekrana Bas
        storyContent.innerHTML = jsonResponse.story;
        storyTranslation.textContent = jsonResponse.translation;
        storyResult.classList.remove('d-none');

    } catch (error) {
        console.error("AI Hatası:", error);
        alert("Hikaye oluşturulurken bir hata oluştu: " + error.message);
    } finally {
        btnGenerateStory.disabled = false;
        btnText.textContent = "🚀 Hikayeyi Yaz";
        btnLoading.classList.add('d-none');
    }
}
















function temaDegistir() {
    const mevcutTema = body.getAttribute('data-theme');
    const yeniTema = mevcutTema === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', yeniTema);
    toggleSwitch.classList.toggle('active', yeniTema === 'dark');
    localStorage.setItem('kelime-kartlari-tema', yeniTema);
}

function temaDurumunuYukle() {
    const kaydedilmisTema = localStorage.getItem('kelime-kartlari-tema') || 'light';
    body.setAttribute('data-theme', kaydedilmisTema);
    toggleSwitch.classList.toggle('active', kaydedilmisTema === 'dark');
}

window.oyunuYenidenBaslat = oyunuYenidenBaslat;