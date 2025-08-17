// Kelime veritabanı - İngilizce ve Türkçe karşılıkları
const kelimeler = [
    { ingilizce: "apple", turkce: "elma" },
    { ingilizce: "book", turkce: "kitap" },
    { ingilizce: "water", turkce: "su" },
    { ingilizce: "house", turkce: "ev" },
    { ingilizce: "car", turkce: "araba" },
    { ingilizce: "tree", turkce: "ağaç" },
    { ingilizce: "school", turkce: "okul" },
    { ingilizce: "friend", turkce: "arkadaş" },
    { ingilizce: "family", turkce: "aile" },
    { ingilizce: "computer", turkce: "bilgisayar" },
    { ingilizce: "phone", turkce: "telefon" },
    { ingilizce: "food", turkce: "yemek" },
    { ingilizce: "love", turkce: "aşk" },
    { ingilizce: "happy", turkce: "mutlu" },
    { ingilizce: "beautiful", turkce: "güzel" },
    { ingilizce: "strong", turkce: "güçlü" },
    { ingilizce: "good", turkce: "iyi" },
    { ingilizce: "bad", turkce: "kötü" },
    { ingilizce: "big", turkce: "büyük" },
    { ingilizce: "small", turkce: "küçük" }
];

// Oyun durumu değişkenleri
let mevcutKelimeIndex = 0;
let kartDurumu = "ingilizce"; // "ingilizce" veya "turkce"
let bilmiyorumListesi = [];
let ogrenilenler = [];
let aktifKelimeler = [...kelimeler];

// DOM elementleri
const card = document.getElementById('card');
const cardText = document.getElementById('card_text');
const biliyorumBtn = document.getElementById('biliyorumBtn');
const bilmiyorumBtn = document.getElementById('bilmiyorumBtn');
const ilerlemeTxt = document.getElementById('ilerleme-text');
const ilerleme = document.getElementById('ilerleme');


// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    ilkKelimeyiGoster();
    eventListenerlarEkle();
});

// Event listener'ları ekle
function eventListenerlarEkle() {
    // Karta tıklayınca çevir
    card.addEventListener('click', kartiCevir);
    
    // Biliyorum butonu
    biliyorumBtn.addEventListener('click', function() {
        kartAnimasyonu('right');
        setTimeout(() => {
            biliyorumIsle();
        }, 300);
    });
    
    // Bilmiyorum butonu
    bilmiyorumBtn.addEventListener('click', function() {
        kartAnimasyonu('left');
        setTimeout(() => {
            bilmiyorumIsle();
        }, 300);
    });
    
    // Klavye desteği
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            biliyorumBtn.click();
        } else if (e.key === 'ArrowLeft' || e.key === ' ') {
            bilmiyorumBtn.click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            kartiCevir();
        }
    });
}

// İlk kelimeyi göster
function ilkKelimeyiGoster() {
    if (aktifKelimeler.length > 0) {
        kartDurumu = "ingilizce";
        cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
        kartRenginiSifirla();
    } else {
        oyunBitti();
    }
}

// Kartı çevir (İngilizce ↔ Türkçe)
function kartiCevir() {
    card.style.transform   = 'rotateY(8deg)';
    
    setTimeout(() => {
        if (kartDurumu === "ingilizce") {
            kartDurumu = "turkce";
            cardText.textContent = aktifKelimeler[mevcutKelimeIndex].turkce;
        } else {
            kartDurumu = "ingilizce";
            cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
        }
        
        card.style.transform = 'rotateY(0deg)';
    }, 200);
} 

// Kart animasyonu (sağa veya sola kaydırma)
function kartAnimasyonu(yon) {
    card.classList.add(yon);
    
    // Animasyon sonrası temizleme
    setTimeout(() => {
        card.classList.remove(yon);
        kartRenginiSifirla();
    }, 600);
}

// Kart rengini sıfırla
function kartRenginiSifirla() {
    card.style.backgroundColor = '#fff';
    card.style.transform = 'translateX(0px) rotate(0deg)';
}

// Biliyorum butonuna basıldığında
function biliyorumIsle() {
    // Kelimeyi öğrenilenler listesine ekle
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];

    if (!ogrenilenler.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        ogrenilenler.push(mevcutKelime);
    }
    
    // Kelimeyi aktif listeden çıkar
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    
    // Bir sonraki kelimeye geç
    sonrakiKelime();
    
    console.log(`Öğrenilen: ${mevcutKelime.ingilizce} - ${mevcutKelime.turkce}`);
    durumGoster();
}

// Bilmiyorum butonuna basıldığında
function bilmiyorumIsle() {
    // Kelimeyi bilmiyorum listesine ekle
    const mevcutKelime = aktifKelimeler[mevcutKelimeIndex];
    
    if (!bilmiyorumListesi.find(k => k.ingilizce === mevcutKelime.ingilizce)) {
        bilmiyorumListesi.push(mevcutKelime);
    }
    
    // Kelimeyi aktif listeden çıkar
    aktifKelimeler.splice(mevcutKelimeIndex, 1);
    
    // Kelimeyi listenin sonuna ekle (tekrar gösterilmek üzere)
    aktifKelimeler.push(mevcutKelime);
    
    // Bir sonraki kelimeye geç
    sonrakiKelime();
    
    console.log(`Tekrar edilecek: ${mevcutKelime.ingilizce} - ${mevcutKelime.turkce}`);
    durumGoster();
}

// Sonraki kelimeye geç
function sonrakiKelime() {
    const{toplam ,ogrenilenYuzde,uzunluk}  =istatistikleriGoster()
   ilerlemeTxt.textContent=`İlerleme: %${ogrenilenYuzde} (${ogrenilenler.length}/${toplam})`
  
    if (aktifKelimeler.length === 0) {
        oyunBitti();
        return;
    }
    
    // Index kontrolü
    if (mevcutKelimeIndex >= aktifKelimeler.length) {
        mevcutKelimeIndex = 0;
    }
    
    // Yeni kelimeyi göster
    kartDurumu = "ingilizce";
    cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
}

// Oyun durumunu konsola yazdır
function durumGoster() {
    console.log("=== DURUM ===");
    console.log(`Kalan kelimeler: ${aktifKelimeler.length}`);
    console.log(`Öğrenilenler: ${ogrenilenler.length}`);
    console.log(`Tekrar edilecekler: ${bilmiyorumListesi.length}`);
    console.log("=============");
}

// Oyun bittiğinde
function oyunBitti() {
    cardText.innerHTML = `
        <div style="text-align: center;">
            <h3>🎉 Tebrikler!</h3>
            <p>Tüm kelimeleri tamamladınız!</p>
            <small>Öğrenilen: ${ogrenilenler.length} kelime</small>
            <br>
            <button onclick="oyunuYenidenBaslat()" class="btn btn-primary mt-2">
                Yeniden Başla
            </button>
        </div>
    `;
    
    // Butonları gizle
    biliyorumBtn.style.display = 'none';
    bilmiyorumBtn.style.display = 'none';
}

// Oyunu yeniden başlat
function oyunuYenidenBaslat() {
    mevcutKelimeIndex = 0;
    kartDurumu = "ingilizce";
    bilmiyorumListesi = [];
    ogrenilenler = [];
    aktifKelimeler = [...kelimeler];
    const{toplam ,ogrenilenYuzde,uzunluk}  =istatistikleriGoster()
   ilerlemeTxt.textContent=`İlerleme: %${ogrenilenYuzde} (${ogrenilenler.length}/${toplam})`
    
    // Butonları göster
    biliyorumBtn.style.display = 'inline-block';
    bilmiyorumBtn.style.display = 'inline-block';
    
    ilkKelimeyiGoster();
    console.log("Oyun yeniden başlatıldı!");
}

// Rastgele sıralama fonksiyonu (opsiyonel)
function kelimeleriKaristir() {
    for (let i = aktifKelimeler.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [aktifKelimeler[i], aktifKelimeler[j]] = [aktifKelimeler[j], aktifKelimeler[i]];
    }
}

// İstatistikleri göster 
function istatistikleriGoster() {
    const toplam = kelimeler.length;
    const ogrenilenYuzde = Math.round((ogrenilenler.length / toplam) * 100);
    
   // console.log(`İlerleme: %${ogrenilenYuzde} (${ogrenilenler.length}/${toplam})`);
    return {
        toplam:toplam,
        ogrenilenYuzde:ogrenilenYuzde,
        uzunluk: ogrenilenler.length,
    };
}
