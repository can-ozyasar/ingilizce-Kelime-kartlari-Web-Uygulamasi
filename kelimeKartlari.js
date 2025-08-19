    import  {kelimeler}  from "./kelimeler.js"

        const tumKelimeler = kelimeler;

        // ========== KELİME VERİTABANI - BURAYA KELİMELERİ YAZIN ==========

        // ================================================================

        // Oyun durumu değişkenleri
        let mevcutBolum = 1;
        let mevcutKelimeler = [];
        let kullaniciKelimeleri = []; // Kullanıcının yüklediği kelimeler
        let mevcutKelimeIndex = 0;
        let kartDurumu = "ingilizce"; // "ingilizce" veya "turkce"
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

        // Kelime yükleme elementleri
        const kelimeYukleBtn = document.getElementById('kelime-yukle-btn');
        const kelimeYuklePanel = document.getElementById('kelime-yukle-panel');
        const kelimeTextarea = document.getElementById('kelime-textarea');
        const kelimeSayisiDiv = document.getElementById('kelime-sayisi');
        const btnYukle = document.getElementById('btn-yukle');
        const btnTemizle = document.getElementById('btn-temizle');
        const btnKapat = document.getElementById('btn-kapat');

        // Bölüm butonları
        const bolumBtnlari = [
            document.getElementById('btn-1'),
            document.getElementById('btn-2'),
            document.getElementById('btn-3'),
            document.getElementById('btn-4'),
            document.getElementById('btn-5'),
            document.getElementById('btn-6') // Özel kelimeler butonu
        ];

        // Kelimeleri bölümlere ayırma (her bölümde 200 kelime)
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

        // Sayfa yüklendiğinde başlat
        document.addEventListener('DOMContentLoaded', function () {
            eventListenerlarEkle();
            temaDurumunuYukle();
            kullaniciKelimeleriniYukle();
            bolumDegistir(1); // İlk bölümü yükle
        });

        // Event listener'ları ekle
        function eventListenerlarEkle() {
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

        // Bölüm değiştirme
        function bolumDegistir(bolumNo) {
            mevcutBolum = bolumNo;

            bolumBtnlari.forEach((btn, index) => {
                btn.classList.toggle('active', index + 1 === bolumNo);
            });

            if (bolumNo === 6) { // Özel Kelimeler Bölümü
                if (kullaniciKelimeleri.length === 0) {
                    alert('Özel kelime listeniz boş. Lütfen "Kelime Yükle" menüsünden kelime ekleyin.');
                    cardText.textContent = 'Özel kelime listeniz boş';
                    mevcutKelimeler = [];
                    oyunuSifirla();
                    return;
                }
                mevcutKelimeler = [...kullaniciKelimeleri];
            } else { // Normal Bölümler
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

        // Oyunu sıfırla
        function oyunuSifirla() {
            mevcutKelimeIndex = 0;
            kartDurumu = "ingilizce";
            bilmiyorumListesi = [];
            ogrenilenler = [];
            aktifKelimeler = [...mevcutKelimeler];

            biliyorumBtn.style.display = 'inline-block';
            bilmiyorumBtn.style.display = 'inline-block';

            if (aktifKelimeler.length > 0) {
                kelimeleriKaristir();
                ilkKelimeyiGoster();
            } else {
                oyunBitti();
            }
            ilerlemeyiGuncelle();
        }

        // İlk kelimeyi göster
        function ilkKelimeyiGoster() {
            if (aktifKelimeler.length > 0) {
                kartDurumu = "ingilizce";
                cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
                kartRenginiSifirla();
                ilerlemeyiGuncelle();
            } else {
                oyunBitti();
            }
        }

        // Kartı çevir (İngilizce ↔ Türkçe)
        function kartiCevir() {
            if (animasyonDevamEdiyor || aktifKelimeler.length === 0) return;

            animasyonDevamEdiyor = true;
            card.classList.add('flipping');

            setTimeout(() => {
                if (kartDurumu === "ingilizce") {
                    kartDurumu = "turkce";
                    cardText.textContent = aktifKelimeler[mevcutKelimeIndex].turkce;
                } else {
                    kartDurumu = "ingilizce";
                    cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
                }
            }, 300);

            setTimeout(() => {
                card.classList.remove('flipping');
                animasyonDevamEdiyor = false;
            }, 600);
        }

        // Kart animasyonu (sağa veya sola kaydırma)
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
            kartDurumu = "ingilizce";
            cardText.textContent = aktifKelimeler[mevcutKelimeIndex].ingilizce;
        }

        function ilerlemeyiGuncelle() {
            const toplamKelime = mevcutKelimeler.length;
            const ogrenilenSayi = ogrenilenler.length;
            const yuzde = toplamKelime > 0 ? Math.round((ogrenilenSayi / toplamKelime) * 100) : 0;
            const bolumAdi = mevcutBolum === 6 ? 'Özel' : `Bölüm ${mevcutBolum}`;
            ilerlemeTxt.textContent = `İlerleme: %${yuzde} (${ogrenilenSayi}/${toplamKelime}) - ${bolumAdi}`;
        }

        function oyunBitti() {
            const toplamKelime = mevcutKelimeler.length;
            if (toplamKelime === 0 && mevcutBolum !== 6) {
                cardText.innerHTML = `Bu bölümde kelime bulunmuyor.`;
                biliyorumBtn.style.display = 'none';
                bilmiyorumBtn.style.display = 'none';
                return;
            }

            const bolumAdi = mevcutBolum === 6 ? 'Özel Kelimeleriniz' : `Bölüm ${mevcutBolum}`;
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
            oyunuSifirla();
        }

        function kelimeleriKaristir() {
            for (let i = aktifKelimeler.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [aktifKelimeler[i], aktifKelimeler[j]] = [aktifKelimeler[j], aktifKelimeler[i]];
            }
        }

        // ===================================================
        // YENİ EKLENEN FONKSİYONLAR
        // ===================================================

        // Kelime yükleme panelini aç/kapat
        function kelimeYuklePaneliniAc() {
            kelimeYuklePanel.classList.add('show');
            kelimeOnizlemesiniGuncelle();
        }

        function kelimeYuklePaneliniKapat() {
            kelimeYuklePanel.classList.remove('show');
        }

        // Textarea'daki kelime sayısını anlık olarak göster
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

        // Kelimeleri yükle
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
            kullaniciKelimeleriniKaydet();

            alert(`${yeniKelimeler.length} kelime başarıyla yüklendi!`);
            kelimeYuklePaneliniKapat();

            if (mevcutBolum === 6) {
                bolumDegistir(6);
            }
        }

        // Kelimeleri temizle
        function kelimeleriTemizle() {
            if (confirm('Tüm özel kelimeleriniz silinecek. Emin misiniz?')) {
                kullaniciKelimeleri = [];
                kullaniciKelimeleriniKaydet();
                kelimeTextarea.value = '';
                kelimeOnizlemesiniGuncelle();
                alert('Tüm özel kelimeler silindi.');

                if (mevcutBolum === 6) {
                    bolumDegistir(1);
                }
            }
        }

        // Kullanıcı kelimelerini localStorage'a kaydet
        function kullaniciKelimeleriniKaydet() {
            try {
                localStorage.setItem('kelime-kartlari-ozel-kelimeler', JSON.stringify(kullaniciKelimeleri));
            } catch (e) {
                console.warn('Kelimeler kaydedilemedi:', e);
            }
        }

        // Kullanıcı kelimelerini localStorage'dan yükle
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

        // ===================================================
        // TEMA FONKSİYONLARI
        // ===================================================
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