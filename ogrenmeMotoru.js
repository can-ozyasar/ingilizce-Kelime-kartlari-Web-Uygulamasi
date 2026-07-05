// SM-2 tabanlı basit aralıklı tekrar (spaced repetition) motoru.
// Kelime durumu `ingilizce` alanına göre anahtarlanır (favoriler de aynı deseni kullanır).

const SRS_DEPO_ANAHTARI = 'kelime-kartlari-srs-durumu';
const SERI_DEPO_ANAHTARI = 'kelime-kartlari-seri';
const YENI_SAYAC_ANAHTARI = 'kelime-kartlari-yeni-sayac';
const OGRENILDI_ESIGI_GUN = 21;
const BASLANGIC_EF = 2.5;
const MIN_EF = 1.3;
// Her gün en fazla bu kadar HİÇ görülmemiş kelime "Bugün Tekrarı"na dahil edilir.
// Tekrarı gelen (daha önce görülmüş) kelimeler bu sınırdan etkilenmez, her zaman dahil edilir.
const YENI_KELIME_GUNLUK_LIMIT = 20;

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

function varsayilanKayit() {
    return {
        ef: BASLANGIC_EF,
        tekrarSayisi: 0,
        aralikGun: 0,
        sonrakiTekrarTarihi: bugunTarihi(),
        sonCevap: null,
        guncellenmeZamani: null
    };
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

function smIkiHesapla(kayit, kalite) {
    let { ef, tekrarSayisi, aralikGun } = kayit;
    if (kalite < 3) {
        tekrarSayisi = 0;
        aralikGun = 1;
    } else {
        if (tekrarSayisi === 0) {
            aralikGun = 1;
        } else if (tekrarSayisi === 1) {
            aralikGun = 6;
        } else {
            aralikGun = Math.round(aralikGun * ef);
        }
        tekrarSayisi += 1;
    }
    ef = Math.max(MIN_EF, ef + (0.1 - (5 - kalite) * (0.08 + (5 - kalite) * 0.02)));
    return { ef, tekrarSayisi, aralikGun, sonrakiTekrarTarihi: tarihEkle(bugunTarihi(), aralikGun) };
}

/** @param {string} ingilizce */
export function kelimeDurumunuOku(ingilizce) {
    const harita = durumHaritasiniOku();
    return harita[ingilizce] || varsayilanKayit();
}

/** Tek yazma noktası: SM-2 hesabını yapar, kelime durumunu, günlük seriyi ve yeni-kelime sayacını günceller. */
export function kelimeSonucunuKaydet(ingilizce, biliyorMu) {
    const kalite = biliyorMu ? 4 : 2;
    const harita = durumHaritasiniOku();
    const ilkKezMi = !harita[ingilizce];
    const mevcut = harita[ingilizce] || varsayilanKayit();
    const guncel = {
        ...mevcut,
        ...smIkiHesapla(mevcut, kalite),
        sonCevap: biliyorMu ? 'biliyorum' : 'bilmiyorum',
        guncellenmeZamani: new Date().toISOString()
    };
    harita[ingilizce] = guncel;
    durumHaritasiniYaz(harita);
    gunlukSeriGuncelle();
    if (ilkKezMi) {
        yeniKelimeSayacinaEkle();
    }
    return guncel;
}

export function kelimeBugunTekrardaMi(ingilizce) {
    return kelimeDurumunuOku(ingilizce).sonrakiTekrarTarihi <= bugunTarihi();
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
        const kayit = harita[k.ingilizce];
        if (kayit && kayit.aralikGun >= OGRENILDI_ESIGI_GUN) {
            ogrenilenSayisi++;
        }
    });
    const bugunTekrarSayisi = bugunTekrarEdilecekleriGetir(kelimeHavuzu).length;
    return { toplamKelime: kelimeHavuzu.length, ogrenilenSayisi, bugunTekrarSayisi };
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
        return ham ? JSON.parse(ham) : { mevcutSeri: 0, sonAktifTarih: null };
    } catch (e) {
        console.warn('Seri durumu okunamadı:', e);
        return { mevcutSeri: 0, sonAktifTarih: null };
    }
}

function gunlukSeriGuncelle() {
    const bugun = bugunTarihi();
    const durum = seriDurumunuOku();
    if (durum.sonAktifTarih === bugun) return;
    const dun = tarihEkle(bugun, -1);
    const guncel = { mevcutSeri: durum.sonAktifTarih === dun ? durum.mevcutSeri + 1 : 1, sonAktifTarih: bugun };
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
    return { mevcutSeri: 0, sonAktifTarih: durum.sonAktifTarih };
}
