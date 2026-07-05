// SM-2 tabanlı basit aralıklı tekrar (spaced repetition) motoru.
// Kelime durumu `ingilizce` alanına göre anahtarlanır (favoriler de aynı deseni kullanır).

const SRS_DEPO_ANAHTARI = 'kelime-kartlari-srs-durumu';
const SERI_DEPO_ANAHTARI = 'kelime-kartlari-seri';
const OGRENILDI_ESIGI_GUN = 21;
const BASLANGIC_EF = 2.5;
const MIN_EF = 1.3;

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

/** Tek yazma noktası: SM-2 hesabını yapar, kelime durumunu ve günlük seriyi kaydeder. */
export function kelimeSonucunuKaydet(ingilizce, biliyorMu) {
    const kalite = biliyorMu ? 4 : 2;
    const harita = durumHaritasiniOku();
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
    return guncel;
}

export function kelimeBugunTekrardaMi(ingilizce) {
    return kelimeDurumunuOku(ingilizce).sonrakiTekrarTarihi <= bugunTarihi();
}

/** @param {{ingilizce: string}[]} kelimeHavuzu */
export function bugunTekrarEdilecekleriGetir(kelimeHavuzu) {
    return kelimeHavuzu.filter(k => kelimeBugunTekrardaMi(k.ingilizce));
}

/** @param {{ingilizce: string}[]} kelimeHavuzu */
export function istatistikleriGetir(kelimeHavuzu) {
    const harita = durumHaritasiniOku();
    const bugun = bugunTarihi();
    let ogrenilenSayisi = 0;
    let bugunTekrarSayisi = 0;
    kelimeHavuzu.forEach(k => {
        const kayit = harita[k.ingilizce];
        if (kayit && kayit.aralikGun >= OGRENILDI_ESIGI_GUN) {
            ogrenilenSayisi++;
        }
        const dueTarihi = kayit ? kayit.sonrakiTekrarTarihi : bugun;
        if (dueTarihi <= bugun) {
            bugunTekrarSayisi++;
        }
    });
    return { toplamKelime: kelimeHavuzu.length, ogrenilenSayisi, bugunTekrarSayisi };
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

export function seriBilgisiGetir() {
    return seriDurumunuOku();
}
