import { kelimeler } from "./kelimelerOkunuslu.js";
import * as ogrenmeMotoru from "./ogrenmeMotoru.js";
import { temaSistemBaslat } from "./tema.js";

const tumKelimeler = kelimeler;

const OZEL_MODU = 'ozel';
const BUGUN_MODU = 'bugun';
const SEVIYELER = ['A1', 'A2', 'B1', 'B2', 'C1'];

const SVG_STAR_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`;
const SVG_STAR_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z"/></svg>`;


// Oyun durumu değişkenleri
let mevcutBolum = BUGUN_MODU;
let mevcutKelimeler = [];
let kullaniciKelimeleri = []; // Kullanıcının yüklediği kelimeler (Favoriler)
let mevcutKelimeIndex = 0;
let kartDurumu = "ingilizce";
let bilmiyorumListesi = [];
let ogrenilenler = [];
let aktifKelimeler = [];
let animasyonDevamEdiyor = false;
let temizlemeOnayBekleniyor = false;
let temizlemeOnayZamanlayici = null;

// Sürükleme (swipe) durumu
let suruklemeAktif = false;
let suruklemePointerId = null;
let suruklemeBaslangicX = 0;
let suruklemeBaslangicY = 0;
let suruklemeDeltaX = 0;
let suruklemeGercekHareket = false;
const SURUKLEME_TIKLAMA_ESIGI = 6; // px - altı tıklama, üstü sürükleme sayılır
const SURUKLEME_KARAR_ESIGI = 100; // px - bu mesafeyi geçince cevap tetiklenir

// DOM elementleri
const card = document.getElementById('card');
const cardText = document.getElementById('card_text');
const biliyorumBtn = document.getElementById('biliyorumBtn');
const bilmiyorumBtn = document.getElementById('bilmiyorumBtn');
const ilerlemeTxt = document.getElementById('ilerleme-text');
const kelimeYukleBtn = document.getElementById('kelime-yukle-btn');
const kelimeYuklePanel = document.getElementById('kelime-yukle-panel');
const kelimeTextarea = document.getElementById('kelime-textarea');
const kelimeSayisiDiv = document.getElementById('kelime-sayisi');
const btnYukle = document.getElementById('btn-yukle');
const btnTemizle = document.getElementById('btn-temizle');
const btnTemizleOrijinalHTML = btnTemizle.innerHTML;
const btnKapat = document.getElementById('btn-kapat');
const favlama = document.getElementById("favlama");
const okunusTxt = document.getElementById("card_pronunciation");
const cardTab = document.getElementById('card-tab');
const btnBugunTekrar = document.getElementById('btn-bugun-tekrar');
const durumBugunSayi = document.getElementById('durum-bugun-sayi');
const durumSeriSayi = document.getElementById('durum-seri-sayi');
const durumOgrenilenSayi = document.getElementById('durum-ogrenilen-sayi');
const toastAlani = document.getElementById('toast-alani');
const cardStampYes = document.getElementById('card-stamp-yes');
const cardStampNo = document.getElementById('card-stamp-no');

let bolumBtnlari = [];
let seviyeBtnlari = [];

function kelimeleriAyir() {
    const bolumler = [];
    const kelimePerBolum = 200;
    const bolumSayisi = Math.ceil(tumKelimeler.length / kelimePerBolum);
    for (let i = 0; i < bolumSayisi; i++) {
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
    bolumButonlariniOlustur();
    seviyeButonlariniOlustur();
    eventListenerlarEkle();
    temaSistemBaslat();
    kullaniciKelimeleriniYukle();
    bugunTekrarBaslat();
});

function bolumButonlariniOlustur() {
    const container = document.getElementById('bolum-butonlari-container');
    bolumler.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `btn-${index + 1}`;
        btn.className = 'chip';
        btn.textContent = String(index + 1);
        container.appendChild(btn);
    });
    bolumBtnlari = Array.from(container.children).concat(document.getElementById('btn-ozel'));
}

function seviyeButonlariniOlustur() {
    const container = document.getElementById('seviye-butonlari-container');
    SEVIYELER.forEach(seviye => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `btn-seviye-${seviye}`;
        btn.className = 'chip chip-seviye';
        btn.textContent = seviye;
        container.appendChild(btn);
    });
    seviyeBtnlari = Array.from(container.children);
}

function eventListenerlarEkle() {
    favlama.addEventListener('click', favoriDurumunuDegistir);
    card.addEventListener('click', kartiCevirTikla);
    card.addEventListener('pointerdown', suruklemeBaslat);
    card.addEventListener('pointermove', suruklemeDevamEt);
    card.addEventListener('pointerup', suruklemeBitir);
    card.addEventListener('pointercancel', suruklemeIptal);
    const sonIndex = bolumBtnlari.length - 1;
    bolumBtnlari.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            bolumDegistir(index === sonIndex ? OZEL_MODU : index + 1);
        });
    });
    seviyeBtnlari.forEach((btn, index) => {
        btn.addEventListener('click', () => seviyeDegistir(SEVIYELER[index]));
    });
    btnBugunTekrar.addEventListener('click', bugunTekrarBaslat);
    kelimeYukleBtn.addEventListener('click', kelimeYuklePaneliniAc);
    btnKapat.addEventListener('click', kelimeYuklePaneliniKapat);
    btnYukle.addEventListener('click', kelimeleriYukle);
    btnTemizle.addEventListener('click', kelimeleriTemizle);
    kelimeTextarea.addEventListener('input', kelimeOnizlemesiniGuncelle);
    biliyorumBtn.addEventListener('click', function () {
        cevapVer('right');
    });
    bilmiyorumBtn.addEventListener('click', function () {
        cevapVer('left');
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

function tumHavuzuGetir() {
    const harita = new Map();
    tumKelimeler.forEach(k => harita.set(k.ingilizce, k));
    kullaniciKelimeleri.forEach(k => harita.set(k.ingilizce, k));
    return Array.from(harita.values());
}

function bugunTekrarBaslat() {
    mevcutBolum = BUGUN_MODU;
    bolumBtnlari.forEach(btn => btn.classList.remove('active'));
    seviyeBtnlari.forEach(btn => btn.classList.remove('active'));
    btnBugunTekrar.classList.add('active');
    mevcutKelimeler = ogrenmeMotoru.bugunTekrarEdilecekleriGetir(tumHavuzuGetir());
    oyunuSifirla();
}

function bolumDegistir(bolumNo) {
    mevcutBolum = bolumNo;
    btnBugunTekrar.classList.remove('active');
    seviyeBtnlari.forEach(btn => btn.classList.remove('active'));
    const sonIndex = bolumBtnlari.length - 1;
    bolumBtnlari.forEach((btn, index) => {
        const buAktif = index === sonIndex ? bolumNo === OZEL_MODU : bolumNo === index + 1;
        btn.classList.toggle('active', buAktif);
    });
    if (bolumNo === OZEL_MODU) {
        if (kullaniciKelimeleri.length === 0) {
            bildirimGoster('Favori kelime listeniz boş. Kartların üzerindeki yıldız ikonuna basarak favori ekleyebilirsiniz.', 'bilgi');
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

function seviyeDegistir(seviye) {
    mevcutBolum = seviye;
    btnBugunTekrar.classList.remove('active');
    bolumBtnlari.forEach(btn => btn.classList.remove('active'));
    seviyeBtnlari.forEach(btn => btn.classList.toggle('active', btn.textContent === seviye));
    mevcutKelimeler = tumHavuzuGetir().filter(k => k.seviye === seviye);
    if (mevcutKelimeler.length === 0) {
        cardText.textContent = `${seviye} seviyesinde kelime bulunamadı`;
        oyunuSifirla();
        return;
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
    durumCubuguGuncelle();
    kartTabiGuncelle();
}

function kartTabiGuncelle() {
    cardTab.textContent = mevcutBolum === OZEL_MODU ? 'Özel'
        : mevcutBolum === BUGUN_MODU ? 'Bugün'
        : SEVIYELER.includes(mevcutBolum) ? mevcutBolum
        : `Bölüm ${mevcutBolum}`;
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

function cevapVer(yon) {
    if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;
    kartAnimasyonu(yon);
    setTimeout(() => {
        if (yon === 'right') {
            biliyorumIsle();
        } else {
            bilmiyorumIsle();
        }
    }, 300);
}

// Sürükleyerek atılan kartı ekrandan uçurur, ardından cevabı işler
function kartUcur(yon) {
    animasyonDevamEdiyor = true;
    const azaltilmisHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sure = azaltilmisHareket ? 0 : 300;
    const hedefX = yon === 'right' ? 500 : -500;
    const rotasyon = yon === 'right' ? 18 : -18;
    card.style.transition = azaltilmisHareket ? 'none' : `transform ${sure}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${sure}ms ease`;
    card.style.transform = `translateX(${hedefX}px) rotate(${rotasyon}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
        if (yon === 'right') {
            biliyorumIsle();
        } else {
            bilmiyorumIsle();
        }
        card.style.transition = 'none';
        card.style.transform = '';
        card.style.opacity = '';
        void card.offsetWidth; // yeni transform anında uygulansın, eskiye doğru animasyon oluşmasın
        card.style.transition = '';
        animasyonDevamEdiyor = false;
    }, sure);
}

function kartiCevirTikla() {
    if (suruklemeGercekHareket) {
        suruklemeGercekHareket = false;
        return;
    }
    kartiCevir();
}

function suruklemeBaslat(e) {
    if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suruklemeAktif = true;
    suruklemePointerId = e.pointerId;
    suruklemeBaslangicX = e.clientX;
    suruklemeBaslangicY = e.clientY;
    suruklemeDeltaX = 0;
    suruklemeGercekHareket = false;
}

function suruklemeDevamEt(e) {
    if (!suruklemeAktif || e.pointerId !== suruklemePointerId) return;
    const deltaX = e.clientX - suruklemeBaslangicX;
    const deltaY = e.clientY - suruklemeBaslangicY;
    if (!suruklemeGercekHareket) {
        if (Math.abs(deltaX) < SURUKLEME_TIKLAMA_ESIGI && Math.abs(deltaY) < SURUKLEME_TIKLAMA_ESIGI) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Dikey kaydırma: sayfa scroll'una bırak, kart sürüklemesi başlatma
            suruklemeAktif = false;
            return;
        }
        suruklemeGercekHareket = true;
        card.classList.add('surukleniyor');
        card.setPointerCapture(suruklemePointerId);
    }
    suruklemeDeltaX = deltaX;
    const rotasyon = Math.max(-16, Math.min(16, deltaX / 9));
    card.style.transform = `translateX(${deltaX}px) rotate(${rotasyon}deg)`;
    const oran = Math.min(Math.abs(deltaX) / SURUKLEME_KARAR_ESIGI, 1);
    cardStampYes.style.opacity = deltaX > 0 ? oran : 0;
    cardStampNo.style.opacity = deltaX < 0 ? oran : 0;
}

function suruklemeBitir(e) {
    if (!suruklemeAktif || e.pointerId !== suruklemePointerId) return;
    suruklemeAktif = false;
    card.classList.remove('surukleniyor');
    if (!suruklemeGercekHareket) return;
    const deltaX = suruklemeDeltaX;
    cardStampYes.style.opacity = 0;
    cardStampNo.style.opacity = 0;
    if (deltaX >= SURUKLEME_KARAR_ESIGI) {
        kartUcur('right');
    } else if (deltaX <= -SURUKLEME_KARAR_ESIGI) {
        kartUcur('left');
    } else {
        card.style.transform = '';
    }
}

function suruklemeIptal(e) {
    if (!suruklemeAktif || e.pointerId !== suruklemePointerId) return;
    suruklemeAktif = false;
    suruklemeGercekHareket = false;
    card.classList.remove('surukleniyor');
    card.style.transform = '';
    cardStampYes.style.opacity = 0;
    cardStampNo.style.opacity = 0;
}

function biliyorumIsle() {
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    if (!ogrenilenler.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        ogrenilenler.push(mevcutKelime);
    }
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    ogrenmeMotoru.kelimeSonucunuKaydet(mevcutKelime.ingilizce, true);
    durumCubuguGuncelle();
    sonrakiKelime();
}

function bilmiyorumIsle() {
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    if (!bilmiyorumListesi.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        bilmiyorumListesi.push(mevcutKelime);
    }
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    aktifKelimeler.push(mevcutKelime);
    ogrenmeMotoru.kelimeSonucunuKaydet(mevcutKelime.ingilizce, false);
    durumCubuguGuncelle();
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
    const bolumAdi = mevcutBolum === OZEL_MODU ? 'Favoriler'
        : mevcutBolum === BUGUN_MODU ? 'Bugün Tekrarı'
        : SEVIYELER.includes(mevcutBolum) ? `Seviye ${mevcutBolum}`
        : `Bölüm ${mevcutBolum}`;
    ilerlemeTxt.textContent = `İlerleme: %${yuzde} (${ogrenilenSayi}/${toplamKelime}) - ${bolumAdi}`;
}

function oyunBitti() {
    favlama.style.display = 'none';
    biliyorumBtn.style.display = 'none';
    bilmiyorumBtn.style.display = 'none';
    okunusTxt.textContent = '';
    const toplamKelime = mevcutKelimeler.length;

    if (toplamKelime === 0) {
        if (mevcutBolum === BUGUN_MODU) {
            cardText.innerHTML = `
                <div class="finish-container">
                    <h3>Harika iş!</h3>
                    <p>Bugün için tekrar edilecek kelime yok.</p>
                    <small>Yeni kelimeler için bir Bölüm seçin.</small>
                </div>
            `;
        } else if (mevcutBolum === OZEL_MODU) {
            cardText.textContent = 'Favori kelime listeniz boş';
        } else if (SEVIYELER.includes(mevcutBolum)) {
            cardText.innerHTML = `${mevcutBolum} seviyesinde kelime bulunmuyor.`;
        } else {
            cardText.innerHTML = 'Bu bölümde kelime bulunmuyor.';
        }
        return;
    }

    const bolumAdi = mevcutBolum === OZEL_MODU ? 'Favori Kelimeleriniz'
        : mevcutBolum === BUGUN_MODU ? 'Bugünkü Tekrar'
        : SEVIYELER.includes(mevcutBolum) ? `${mevcutBolum} Seviyesi`
        : `Bölüm ${mevcutBolum}`;
    cardText.innerHTML = `
        <div class="finish-container">
            <h3>Tebrikler!</h3>
            <p>${bolumAdi} tamamlandı!</p>
            <small>Öğrenilen: ${ogrenilenler.length}/${toplamKelime} kelime</small>
            <br>
            <button type="button" class="btn-restart">Yeniden Başla</button>
        </div>
    `;
    const restartBtn = cardText.querySelector('.btn-restart');
    if (restartBtn) restartBtn.addEventListener('click', oyunuYenidenBaslat);
}

function oyunuYenidenBaslat() {
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
        bildirimGoster('Lütfen önce kelime girin!', 'hata');
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
        bildirimGoster('Geçerli kelime bulunamadı! Format: ingilizce,turkce', 'hata');
        return;
    }
    kullaniciKelimeleri = [...yeniKelimeler];
    kullaniciKelimeleriniGuncelle(); // Kaydet ve textarea'yı güncelle
    bildirimGoster(`${yeniKelimeler.length} kelime başarıyla yüklendi!`, 'basari');
    kelimeYuklePaneliniKapat();
    if (mevcutBolum === OZEL_MODU) {
        bolumDegistir(OZEL_MODU);
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
    durumCubuguGuncelle();
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
    if (!temizlemeOnayBekleniyor) {
        temizlemeOnayBekleniyor = true;
        btnTemizle.textContent = 'Emin misiniz? (Tekrar tıklayın)';
        clearTimeout(temizlemeOnayZamanlayici);
        temizlemeOnayZamanlayici = setTimeout(temizlemeOnayiSifirla, 4000);
        return;
    }
    clearTimeout(temizlemeOnayZamanlayici);
    temizlemeOnayiSifirla();
    kullaniciKelimeleri = [];
    kullaniciKelimeleriniGuncelle();
    bildirimGoster('Tüm özel kelimeler silindi.', 'basari');
    if (mevcutBolum === OZEL_MODU) {
        bolumDegistir(OZEL_MODU);
    }
}

function temizlemeOnayiSifirla() {
    temizlemeOnayBekleniyor = false;
    btnTemizle.innerHTML = btnTemizleOrijinalHTML;
}

// --- YARDIMCI FONKSİYON: Kaydetme ve Textarea Güncelleme ---
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


function durumCubuguGuncelle() {
    const havuz = tumHavuzuGetir();
    const istatistik = ogrenmeMotoru.istatistikleriGetir(havuz);
    durumBugunSayi.textContent = istatistik.bugunTekrarSayisi;
    durumSeriSayi.textContent = ogrenmeMotoru.seriBilgisiGetir().mevcutSeri;
    durumOgrenilenSayi.textContent = istatistik.ogrenilenSayisi;
}

function bildirimGoster(mesaj, tur = 'bilgi') {
    const el = document.createElement('div');
    el.className = `toast-mesaj toast-${tur}`;
    el.textContent = mesaj;
    toastAlani.appendChild(el);
    setTimeout(() => el.classList.add('kayboluyor'), 2500);
    setTimeout(() => el.remove(), 2900);
}