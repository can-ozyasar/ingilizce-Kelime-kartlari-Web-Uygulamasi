// FSRS-4.5 tabanlı aralıklı tekrar (spaced repetition) motoru.
// Kelime durumu `ingilizce` alanına göre anahtarlanır (favoriler de aynı deseni kullanır).
//
// FSRS (Free Spaced Repetition Scheduler), her kelime için tek bir "kolaylık
// katsayısı" yerine iki ayrı boyut tutar: zorluk (D, 1-10) ve kararlılık
// (S, gün — hatırlama olasılığının %90'a düştüğü süre). Bu ayrım, eski SM-2
// algoritmasına göre unutma eğrisini çok daha isabetli tahmin eder.
// Referans: https://borretti.me/article/implementing-fsrs-in-100-lines
// (yayınlanan FSRS-4.5 varsayılan ağırlıkları ve formülleri).

const SRS_DEPO_ANAHTARI = 'kelime-kartlari-srs-durumu';
const SERI_DEPO_ANAHTARI = 'kelime-kartlari-seri';
const YENI_SAYAC_ANAHTARI = 'kelime-kartlari-yeni-sayac';
const AKTIVITE_DEPO_ANAHTARI = 'kelime-kartlari-aktivite-log';
const OGRENILDI_ESIGI_GUN = 21;
// Her gün en fazla bu kadar HİÇ görülmemiş kelime "Bugün Tekrarı"na dahil edilir.
// Tekrarı gelen (daha önce görülmüş) kelimeler bu sınırdan etkilenmez, her zaman dahil edilir.
const YENI_KELIME_GUNLUK_LIMIT = 20;

// --- FSRS-4.5 varsayılan parametreleri (17 milyon+ inceleme üzerinde eğitilmiş) ---
const W = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
    1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621
];
const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81; // R(t) = (1 + FACTOR * t/S) ^ DECAY olacak şekilde türetilir
// Zorluk, her güncellemede bu "kolay" çapasına doğru hafifçe geri çekilir (mean reversion).
const D0_KOLAY_ANKOR = zorlukSinirla(W[4] - Math.exp(W[5] * 3) + 1);
// Kullanıcı arayüzü ikili (biliyorum/bilmiyorum) olduğu için FSRS'in 4'lü
// derecelendirmesinden (Again/Hard/Good/Easy) sadece 1 (Again) ve 3 (Good) kullanılır.
const DERECE_BILMIYORUM = 1;
const DERECE_BILIYORUM = 3;

// --- Eski SM-2 kayıtlarını göç ettirmek için gereken sabitler ---
const ESKI_BASLANGIC_EF = 2.5;
const ESKI_MIN_EF = 1.3;

function bugunTarihi() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tarihEkle(tarihStr, gunSayisi) {
    const [yil, ay, gun] = tarihStr.split('-').map(Number);
    const d = new Date(yil, ay - 1, gun);
    d.setDate(d.getDate() + gunSayisi);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** İki 'YYYY-MM-DD' tarihi arasındaki gün farkını döner (yeniTarih - eskiTarih). */
function gunFarkiHesapla(eskiTarihStr, yeniTarihStr) {
    const [y1, m1, d1] = eskiTarihStr.split('-').map(Number);
    const [y2, m2, d2] = yeniTarihStr.split('-').map(Number);
    const t1 = Date.UTC(y1, m1 - 1, d1);
    const t2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((t2 - t1) / 86400000);
}

function zorlukSinirla(d) {
    return Math.min(10, Math.max(1, d));
}

/** Retrievability: t gün sonra hatırlama olasılığı (0-1). */
function hatirlamaOlasiligi(kararlilik, gecenGun) {
    if (kararlilik <= 0) return 0;
    return Math.pow(1 + FSRS_FACTOR * gecenGun / kararlilik, FSRS_DECAY);
}

function ilkKararlilik(derece) {
    return W[derece - 1];
}

function ilkZorluk(derece) {
    return zorlukSinirla(W[4] - Math.exp(W[5] * (derece - 1)) + 1);
}

function zorlukGuncelle(zorlukOnceki, derece) {
    const deltaD = -W[6] * (derece - 3);
    const dPrime = zorlukOnceki + deltaD * (10 - zorlukOnceki) / 9;
    const dCift = W[7] * D0_KOLAY_ANKOR + (1 - W[7]) * dPrime;
    return zorlukSinirla(dCift);
}

function kararlilikGuncelleBasarili(kararlilik, zorluk, r) {
    const alfa = 1 + (11 - zorluk) * Math.pow(kararlilik, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * Math.exp(W[8]);
    return kararlilik * alfa;
}

function kararlilikGuncelleBasarisiz(kararlilik, zorluk, r) {
    const sBasarisiz = Math.pow(zorluk, -W[12]) * (Math.pow(kararlilik + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)) * W[11];
    return Math.min(sBasarisiz, kararlilik);
}

/** FSRS-4.5 çekirdek hesaplaması: yeni zorluk/kararlılık/sonraki tarihi döner. */
function fsrsHesapla(kayit, biliyorMu, gecenGun) {
    const derece = biliyorMu ? DERECE_BILIYORUM : DERECE_BILMIYORUM;
    let zorluk, kararlilik;
    if (kayit.tekrarSayisi === 0) {
        kararlilik = ilkKararlilik(derece);
        zorluk = ilkZorluk(derece);
    } else {
        const r = hatirlamaOlasiligi(kayit.kararlilik, gecenGun);
        zorluk = zorlukGuncelle(kayit.zorluk, derece);
        kararlilik = biliyorMu
            ? kararlilikGuncelleBasarili(kayit.kararlilik, kayit.zorluk, r)
            : kararlilikGuncelleBasarisiz(kayit.kararlilik, kayit.zorluk, r);
    }
    kararlilik = Math.max(0.1, kararlilik);
    const aralikGun = Math.max(1, Math.round(kararlilik));
    return {
        zorluk,
        kararlilik,
        tekrarSayisi: kayit.tekrarSayisi + 1,
        unutmaSayisi: kayit.unutmaSayisi + (biliyorMu ? 0 : 1),
        sonrakiTekrarTarihi: tarihEkle(bugunTarihi(), aralikGun)
    };
}

function varsayilanKayit() {
    const bugun = bugunTarihi();
    return {
        zorluk: 0,
        kararlilik: 0,
        tekrarSayisi: 0,
        unutmaSayisi: 0,
        sonTekrarTarihi: null,
        sonrakiTekrarTarihi: bugun,
        ilkGorulmeTarihi: bugun,
        sonCevap: null,
        guncellenmeZamani: null
    };
}

function eskiKayitMi(kayit) {
    return !!kayit && typeof kayit.ef === 'number' && kayit.kararlilik === undefined;
}

/** Eski SM-2 kaydını ({ef, aralikGun, ...}) FSRS alan adlarına yaklaşık olarak dönüştürür. */
function eskiKayittanGoc(kayit) {
    const efSinirli = Math.min(3, Math.max(ESKI_MIN_EF, kayit.ef || ESKI_BASLANGIC_EF));
    const zorluk = zorlukSinirla(11 - ((efSinirli - ESKI_MIN_EF) / (3 - ESKI_MIN_EF)) * 9);
    const kararlilik = Math.max(0.4, kayit.aralikGun || 1);
    const bilinenTarih = kayit.guncellenmeZamani ? kayit.guncellenmeZamani.slice(0, 10) : bugunTarihi();
    return {
        zorluk,
        kararlilik,
        tekrarSayisi: kayit.tekrarSayisi || 0,
        unutmaSayisi: 0,
        sonTekrarTarihi: bilinenTarih,
        sonrakiTekrarTarihi: kayit.sonrakiTekrarTarihi || bugunTarihi(),
        ilkGorulmeTarihi: bilinenTarih,
        sonCevap: kayit.sonCevap || null,
        guncellenmeZamani: kayit.guncellenmeZamani || null
    };
}

function kayidiNormallestir(kayit) {
    if (!kayit) return varsayilanKayit();
    if (eskiKayitMi(kayit)) return eskiKayittanGoc(kayit);
    return kayit;
}

function durumHaritasiniOku() {
    try {
        const ham = localStorage.getItem(SRS_DEPO_ANAHTARI);
        return ham ? JSON.parse(ham) : {};
    } catch (e) {
        console.warn('SRS durumu okunamadı:', e);
        return {};
    }
}

function durumHaritasiniYaz(harita) {
    try {
        localStorage.setItem(SRS_DEPO_ANAHTARI, JSON.stringify(harita));
    } catch (e) {
        console.warn('SRS durumu kaydedilemedi:', e);
    }
}

function kayitGetirDahili(harita, ingilizce) {
    return kayidiNormallestir(harita[ingilizce]);
}

/** @param {string} ingilizce */
export function kelimeDurumunuOku(ingilizce) {
    return kayitGetirDahili(durumHaritasiniOku(), ingilizce);
}

/** Tek yazma noktası: FSRS hesabını yapar, kelime durumunu, günlük seriyi,
 * aktivite günlüğünü ve yeni-kelime sayacını günceller. */
export function kelimeSonucunuKaydet(ingilizce, biliyorMu) {
    const harita = durumHaritasiniOku();
    const ilkKezMi = !harita[ingilizce];
    const mevcut = kayitGetirDahili(harita, ingilizce);
    const bugun = bugunTarihi();
    const gecenGun = mevcut.tekrarSayisi > 0 && mevcut.sonTekrarTarihi
        ? Math.max(0, gunFarkiHesapla(mevcut.sonTekrarTarihi, bugun))
        : 0;
    const hesap = fsrsHesapla(mevcut, biliyorMu, gecenGun);
    const guncel = {
        ...mevcut,
        ...hesap,
        sonTekrarTarihi: bugun,
        sonCevap: biliyorMu ? 'biliyorum' : 'bilmiyorum',
        guncellenmeZamani: new Date().toISOString()
    };
    harita[ingilizce] = guncel;
    durumHaritasiniYaz(harita);
    gunlukSeriGuncelle();
    aktiviteLoguGuncelle();
    if (ilkKezMi) {
        yeniKelimeSayacinaEkle();
    }
    return guncel;
}

export function kelimeBugunTekrardaMi(ingilizce) {
    return kelimeDurumunuOku(ingilizce).sonrakiTekrarTarihi <= bugunTarihi();
}

/** Belirli bir kelimenin şu andaki tahmini hatırlama olasılığı (0-100).
 * Kelime hiç görülmediyse null döner. */
function hatirlamaOraniHesapla(kayit) {
    if (kayit.tekrarSayisi === 0 || !kayit.sonTekrarTarihi) return null;
    const gecenGun = Math.max(0, gunFarkiHesapla(kayit.sonTekrarTarihi, bugunTarihi()));
    return Math.round(hatirlamaOlasiligi(kayit.kararlilik, gecenGun) * 100);
}

/** @param {string} ingilizce */
export function tahminiHatirlamaOrani(ingilizce) {
    return hatirlamaOraniHesapla(kelimeDurumunuOku(ingilizce));
}

/**
 * Kelime havuzunu "tekrarı gelen" (daha önce görülmüş, süresi gelmiş) ve
 * "hiç görülmemiş" (yeni) olarak ikiye ayırır. İkisi farklı kurallara tabidir:
 * tekrarlar hiçbir zaman ertelenmez, yeniler günlük limitle sınırlanır.
 */
function havuzuAyir(kelimeHavuzu) {
    const harita = durumHaritasiniOku();
    const bugun = bugunTarihi();
    const tekrarGelenler = [];
    const hicGorulmemis = [];
    kelimeHavuzu.forEach(k => {
        const kayit = harita[k.ingilizce];
        if (kayit) {
            if (kayit.sonrakiTekrarTarihi <= bugun) {
                tekrarGelenler.push(k);
            }
        } else {
            hicGorulmemis.push(k);
        }
    });
    return { tekrarGelenler, hicGorulmemis };
}

/** @param {{ingilizce: string}[]} kelimeHavuzu */
export function bugunTekrarEdilecekleriGetir(kelimeHavuzu) {
    const { tekrarGelenler, hicGorulmemis } = havuzuAyir(kelimeHavuzu);
    const kalanYeniHakki = Math.max(0, YENI_KELIME_GUNLUK_LIMIT - bugunTanitilanYeniSayisi());
    return [...tekrarGelenler, ...hicGorulmemis.slice(0, kalanYeniHakki)];
}

/** @param {{ingilizce: string}[]} kelimeHavuzu */
export function istatistikleriGetir(kelimeHavuzu) {
    const harita = durumHaritasiniOku();
    let ogrenilenSayisi = 0;
    kelimeHavuzu.forEach(k => {
        const kayit = kayitGetirDahili(harita, k.ingilizce);
        if (kayit.kararlilik >= OGRENILDI_ESIGI_GUN) {
            ogrenilenSayisi++;
        }
    });
    const bugunTekrarSayisi = bugunTekrarEdilecekleriGetir(kelimeHavuzu).length;
    return { toplamKelime: kelimeHavuzu.length, ogrenilenSayisi, bugunTekrarSayisi };
}

/** Kelime havuzunu tahmini hatırlama sağlığına göre 3 kovaya ayırır. İstatistik ekranı için. */
export function hatirlamaDagilimiGetir(kelimeHavuzu) {
    const harita = durumHaritasiniOku();
    let guclu = 0, orta = 0, riskli = 0, gorulmemis = 0;
    kelimeHavuzu.forEach(k => {
        const oran = hatirlamaOraniHesapla(kayitGetirDahili(harita, k.ingilizce));
        if (oran === null) gorulmemis++;
        else if (oran >= 90) guclu++;
        else if (oran >= 70) orta++;
        else riskli++;
    });
    return { guclu, orta, riskli, gorulmemis };
}

/** Önümüzdeki N gün için planlanmış tekrar sayısını döner (istatistik ekranı: tekrar yükü). */
export function onumuzdekiGunlerYukunuGetir(kelimeHavuzu, gunSayisi = 7) {
    const harita = durumHaritasiniOku();
    const bugun = bugunTarihi();
    const gunler = [];
    for (let i = 0; i < gunSayisi; i++) {
        gunler.push({ tarih: tarihEkle(bugun, i), sayi: 0 });
    }
    const indexHaritasi = new Map(gunler.map((g, i) => [g.tarih, i]));
    kelimeHavuzu.forEach(k => {
        const kayit = harita[k.ingilizce];
        if (!kayit) return;
        const idx = indexHaritasi.get(kayit.sonrakiTekrarTarihi);
        if (idx !== undefined) gunler[idx].sayi++;
    });
    return gunler;
}

function yeniSayacDurumunuOku() {
    try {
        const ham = localStorage.getItem(YENI_SAYAC_ANAHTARI);
        return ham ? JSON.parse(ham) : { tarih: bugunTarihi(), sayi: 0 };
    } catch (e) {
        console.warn('Yeni kelime sayacı okunamadı:', e);
        return { tarih: bugunTarihi(), sayi: 0 };
    }
}

function yeniKelimeSayacinaEkle() {
    const bugun = bugunTarihi();
    let durum = yeniSayacDurumunuOku();
    if (durum.tarih !== bugun) {
        durum = { tarih: bugun, sayi: 0 };
    }
    durum.sayi += 1;
    try {
        localStorage.setItem(YENI_SAYAC_ANAHTARI, JSON.stringify(durum));
    } catch (e) {
        console.warn('Yeni kelime sayacı kaydedilemedi:', e);
    }
}

/** Bugün "Bugün Tekrarı" üzerinden ilk kez tanıtılan (hiç görülmemiş) kelime sayısı. */
export function bugunTanitilanYeniSayisi() {
    const durum = yeniSayacDurumunuOku();
    return durum.tarih === bugunTarihi() ? durum.sayi : 0;
}

function seriDurumunuOku() {
    try {
        const ham = localStorage.getItem(SERI_DEPO_ANAHTARI);
        const durum = ham ? JSON.parse(ham) : {};
        return {
            mevcutSeri: durum.mevcutSeri || 0,
            sonAktifTarih: durum.sonAktifTarih || null,
            enUzunSeri: durum.enUzunSeri || 0
        };
    } catch (e) {
        console.warn('Seri durumu okunamadı:', e);
        return { mevcutSeri: 0, sonAktifTarih: null, enUzunSeri: 0 };
    }
}

function gunlukSeriGuncelle() {
    const bugun = bugunTarihi();
    const durum = seriDurumunuOku();
    if (durum.sonAktifTarih === bugun) return;
    const dun = tarihEkle(bugun, -1);
    const yeniSeri = durum.sonAktifTarih === dun ? durum.mevcutSeri + 1 : 1;
    const guncel = { mevcutSeri: yeniSeri, sonAktifTarih: bugun, enUzunSeri: Math.max(durum.enUzunSeri, yeniSeri) };
    try {
        localStorage.setItem(SERI_DEPO_ANAHTARI, JSON.stringify(guncel));
    } catch (e) {
        console.warn('Seri durumu kaydedilemedi:', e);
    }
}

/**
 * Seriyi GÖRÜNTÜLEME amaçlı okur: kayıtlı sayı sadece "bugün" veya "dün"
 * çalışılmışsa geçerlidir, aksi halde seri fiilen kırılmıştır ve 0 gösterilir
 * (kullanıcı yeniden çalışana kadar depodaki eski sayı silinmez, sadece
 * ekrana yansıtılmaz).
 */
export function seriBilgisiGetir() {
    const durum = seriDurumunuOku();
    const bugun = bugunTarihi();
    const dun = tarihEkle(bugun, -1);
    if (durum.sonAktifTarih === bugun || durum.sonAktifTarih === dun) {
        return durum;
    }
    return { mevcutSeri: 0, sonAktifTarih: durum.sonAktifTarih, enUzunSeri: durum.enUzunSeri };
}

/** Bugün henüz hiç tekrar yapılmadıysa ama dün seri aktifse true döner (seri risk uyarısı). */
export function seriRiskUyarisiGoster() {
    const durum = seriDurumunuOku();
    const bugun = bugunTarihi();
    if (durum.sonAktifTarih === bugun) return false;
    const dun = tarihEkle(bugun, -1);
    return durum.sonAktifTarih === dun && durum.mevcutSeri > 0;
}

function aktiviteLoguOku() {
    try {
        const ham = localStorage.getItem(AKTIVITE_DEPO_ANAHTARI);
        return ham ? JSON.parse(ham) : {};
    } catch (e) {
        console.warn('Aktivite günlüğü okunamadı:', e);
        return {};
    }
}

function aktiviteLoguGuncelle() {
    const bugun = bugunTarihi();
    const log = aktiviteLoguOku();
    log[bugun] = (log[bugun] || 0) + 1;
    try {
        localStorage.setItem(AKTIVITE_DEPO_ANAHTARI, JSON.stringify(log));
    } catch (e) {
        console.warn('Aktivite günlüğü kaydedilemedi:', e);
    }
}

/** Gün -> o gün yapılan cevap sayısı haritasını döner (istatistik ekranı: aktivite takvimi). */
export function aktiviteGunlugunuGetir() {
    return aktiviteLoguOku();
}
