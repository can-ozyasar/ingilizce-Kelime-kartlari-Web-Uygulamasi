import { kelimeler } from "./kelimelerOkunuslu.js";
import * as ogrenmeMotoru from "./ogrenmeMotoru.js";
import { temaSistemBaslat } from "./tema.js";

const SEVIYELER = ['A1', 'A2', 'B1', 'B2', 'C1'];
const OZEL_KELIME_ANAHTARI = 'kelime-kartlari-ozel-kelimeler';

function kullaniciKelimeleriniOku() {
    try {
        const ham = localStorage.getItem(OZEL_KELIME_ANAHTARI);
        return ham ? JSON.parse(ham) : [];
    } catch (e) {
        console.warn('Özel kelimeler okunamadı:', e);
        return [];
    }
}

function tumHavuzuGetir() {
    const harita = new Map();
    kelimeler.forEach(k => harita.set(k.ingilizce, k));
    kullaniciKelimeleriniOku().forEach(k => harita.set(k.ingilizce, k));
    return Array.from(harita.values());
}

function yerelTarihStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seriBolumunuRenderla() {
    const seri = ogrenmeMotoru.seriBilgisiGetir();
    document.getElementById('ist-mevcut-seri').textContent = seri.mevcutSeri;
    document.getElementById('ist-en-uzun-seri').textContent = seri.enUzunSeri;
    const banner = document.getElementById('seri-risk-banner');
    banner.hidden = !ogrenmeMotoru.seriRiskUyarisiGoster();
}

function seviyeIlerlemesiniRenderla() {
    const container = document.getElementById('seviye-ilerleme-liste');
    container.innerHTML = SEVIYELER.map(sv => {
        const havuz = kelimeler.filter(k => k.seviye === sv);
        const ist = ogrenmeMotoru.istatistikleriGetir(havuz);
        const yuzde = ist.toplamKelime > 0 ? Math.round((ist.ogrenilenSayisi / ist.toplamKelime) * 100) : 0;
        return `
            <div class="seviye-ilerleme-satir">
                <div class="seviye-ilerleme-ust">
                    <span class="seviye-etiket">${sv}</span>
                    <span class="seviye-sayi">${ist.ogrenilenSayisi}/${ist.toplamKelime}</span>
                </div>
                <div class="seviye-ilerleme-track">
                    <div class="seviye-ilerleme-dolgu" style="width:${yuzde}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function hatirlamaSagligiRenderla(tumHavuz) {
    const dagilim = ogrenmeMotoru.hatirlamaDagilimiGetir(tumHavuz);
    const toplam = dagilim.guclu + dagilim.orta + dagilim.riskli + dagilim.gorulmemis;
    const kalemler = [
        { sinif: 'guclu', sayi: dagilim.guclu, etiket: 'Güçlü (≥%90)' },
        { sinif: 'orta', sayi: dagilim.orta, etiket: 'Orta (%70-90)' },
        { sinif: 'riskli', sayi: dagilim.riskli, etiket: 'Riskli (<%70)' },
        { sinif: 'gorulmemis', sayi: dagilim.gorulmemis, etiket: 'Görülmemiş' }
    ];
    document.getElementById('hatirlama-bar').innerHTML = kalemler
        .filter(k => k.sayi > 0)
        .map(k => `<div class="hatirlama-parca hatirlama-${k.sinif}" style="width:${(k.sayi / toplam) * 100}%"></div>`)
        .join('');
    document.getElementById('hatirlama-lejant').innerHTML = kalemler
        .map(k => `<span class="hatirlama-lejant-oge"><i class="hatirlama-nokta hatirlama-${k.sinif}"></i>${k.etiket}: ${k.sayi}</span>`)
        .join('');
}

function aktiviteTakviminiRenderla() {
    const log = ogrenmeMotoru.aktiviteGunlugunuGetir();
    const bugun = new Date();
    const grid = document.getElementById('aktivite-grid');
    const hucreler = [];
    for (let i = 34; i >= 0; i--) {
        const d = new Date(bugun);
        d.setDate(d.getDate() - i);
        const tarih = yerelTarihStr(d);
        const sayi = log[tarih] || 0;
        const seviye = sayi === 0 ? 0 : sayi < 5 ? 1 : sayi < 15 ? 2 : 3;
        hucreler.push(`<span class="aktivite-hucre" data-seviye="${seviye}" title="${tarih}: ${sayi} kelime"></span>`);
    }
    grid.innerHTML = hucreler.join('');
}

function tekrarYukunuRenderla(tumHavuz) {
    const gunler = ogrenmeMotoru.onumuzdekiGunlerYukunuGetir(tumHavuz, 7);
    const maks = Math.max(1, ...gunler.map(g => g.sayi));
    const gunAdlari = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    document.getElementById('tekrar-yuku-grafik').innerHTML = gunler.map(g => {
        const [y, m, gun] = g.tarih.split('-').map(Number);
        const d = new Date(y, m - 1, gun);
        const yukseklik = g.sayi > 0 ? Math.max(Math.round((g.sayi / maks) * 100), 6) : 2;
        return `
            <div class="tekrar-yuku-sutun">
                <span class="tekrar-yuku-sayi">${g.sayi}</span>
                <div class="tekrar-yuku-cubuk" style="height:${yukseklik}%"></div>
                <span class="tekrar-yuku-gun">${gunAdlari[d.getDay()]}</span>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', function () {
    temaSistemBaslat();
    const tumHavuz = tumHavuzuGetir();
    const genelIstatistik = ogrenmeMotoru.istatistikleriGetir(tumHavuz);
    document.getElementById('ist-toplam-ogrenilen').textContent = genelIstatistik.ogrenilenSayisi;
    seriBolumunuRenderla();
    seviyeIlerlemesiniRenderla();
    hatirlamaSagligiRenderla(tumHavuz);
    aktiviteTakviminiRenderla();
    tekrarYukunuRenderla(tumHavuz);
});
