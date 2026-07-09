import { kelimeler } from "./kelimelerOkunuslu.js";
import * as ogrenmeMotoru from "./ogrenmeMotoru.js";
import { temaSistemBaslat } from "./tema.js";

const SEVIYELER = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CIFT_SAYISI = 6;
const YANLIS_GOSTERIM_SURESI = 550;

let mevcutSeviye = 'A1';
let seciliKart = null;
let eslesenSayisi = 0;
let hamleSayisi = 0;
let hataliKelimeler = new Set();
let turBaslangicZamani = null;
let girisEngelli = false;

const grid = document.getElementById('oyun-grid');
const seviyeContainer = document.getElementById('oyun-seviye-butonlari');
const ozetEl = document.getElementById('oyun-ozet');
const hamleSayaci = document.getElementById('oyun-hamle-sayaci');
const dogruSayaci = document.getElementById('oyun-dogru-sayaci');

function seviyeButonlariniOlustur() {
    SEVIYELER.forEach(seviye => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip chip-seviye';
        btn.textContent = seviye;
        btn.addEventListener('click', () => {
            mevcutSeviye = seviye;
            turuBaslat();
        });
        seviyeContainer.appendChild(btn);
    });
    seviyeButonlariniGuncelle();
}

function seviyeButonlariniGuncelle() {
    Array.from(seviyeContainer.children).forEach(btn => {
        btn.classList.toggle('active', btn.textContent === mevcutSeviye);
    });
}

// Hiç görülmemiş veya hatırlama olasılığı düşük kelimelere öncelik ver;
// her turda biraz çeşitlilik olsun diye rastgele bir pay eklenir.
function kelimeleriSec(seviye) {
    const havuz = kelimeler.filter(k => k.seviye === seviye);
    const skorlu = havuz.map(kelime => {
        const oran = ogrenmeMotoru.tahminiHatirlamaOrani(kelime.ingilizce);
        const oncelik = (oran === null ? 100 : 100 - oran) + Math.random() * 25;
        return { kelime, oncelik };
    });
    skorlu.sort((a, b) => b.oncelik - a.oncelik);
    return skorlu.slice(0, CIFT_SAYISI).map(x => x.kelime);
}

function kartlariKaristir(dizi) {
    for (let i = dizi.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
    }
    return dizi;
}

function guncelleSayaclar() {
    hamleSayaci.textContent = hamleSayisi;
    dogruSayaci.textContent = `${eslesenSayisi}/${CIFT_SAYISI}`;
}

function turuBaslat() {
    seviyeButonlariniGuncelle();
    girisEngelli = false;
    seciliKart = null;
    eslesenSayisi = 0;
    hamleSayisi = 0;
    hataliKelimeler = new Set();
    turBaslangicZamani = Date.now();
    ozetEl.hidden = true;
    grid.hidden = false;
    guncelleSayaclar();

    const secilenler = kelimeleriSec(mevcutSeviye);
    if (secilenler.length < 3) {
        grid.innerHTML = `<p class="oyun-bos-mesaj">${mevcutSeviye} seviyesinde yeterli kelime yok.</p>`;
        return;
    }

    const kartlar = [];
    secilenler.forEach(kelime => {
        kartlar.push({ anahtar: kelime.ingilizce, metin: kelime.ingilizce });
        kartlar.push({ anahtar: kelime.ingilizce, metin: kelime.turkce });
    });
    kartlariKaristir(kartlar);

    grid.innerHTML = '';
    kartlar.forEach(kart => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'oyun-kart';
        btn.textContent = kart.metin;
        btn.addEventListener('click', () => kartaTikla(btn, kart));
        grid.appendChild(btn);
    });
}

function kartaTikla(btn, kart) {
    if (girisEngelli || btn.disabled) return;
    if (seciliKart && seciliKart.el === btn) return;

    if (!seciliKart) {
        seciliKart = { el: btn, kart };
        btn.classList.add('secili');
        return;
    }

    const ilkKart = seciliKart;
    seciliKart = null;
    hamleSayisi++;
    guncelleSayaclar();

    if (ilkKart.kart.anahtar === kart.anahtar) {
        ilkKart.el.classList.remove('secili');
        ilkKart.el.classList.add('esti');
        btn.classList.add('esti');
        ilkKart.el.disabled = true;
        btn.disabled = true;
        eslesenSayisi++;
        guncelleSayaclar();
        const biliyorMu = !hataliKelimeler.has(kart.anahtar);
        ogrenmeMotoru.kelimeSonucunuKaydet(kart.anahtar, biliyorMu);
        if (eslesenSayisi === CIFT_SAYISI) {
            setTimeout(turuBitir, 400);
        }
    } else {
        hataliKelimeler.add(ilkKart.kart.anahtar);
        hataliKelimeler.add(kart.anahtar);
        girisEngelli = true;
        ilkKart.el.classList.remove('secili');
        ilkKart.el.classList.add('yanlis');
        btn.classList.add('yanlis');
        setTimeout(() => {
            ilkKart.el.classList.remove('yanlis');
            btn.classList.remove('yanlis');
            girisEngelli = false;
        }, YANLIS_GOSTERIM_SURESI);
    }
}

function turuBitir() {
    const sure = Math.round((Date.now() - turBaslangicZamani) / 1000);
    grid.hidden = true;
    ozetEl.hidden = false;
    ozetEl.innerHTML = `
        <div class="finish-container">
            <h3>Tur tamamlandı!</h3>
            <p>${CIFT_SAYISI} çift, ${hamleSayisi} hamlede eşleştirildi.</p>
            <small>Süre: ${sure} saniye</small>
            <br>
            <button type="button" class="btn-restart" id="oyun-yeniden-btn">Yeni Tur</button>
        </div>
    `;
    document.getElementById('oyun-yeniden-btn').addEventListener('click', turuBaslat);
}

document.addEventListener('DOMContentLoaded', function () {
    temaSistemBaslat();
    seviyeButonlariniOlustur();
    turuBaslat();
});
