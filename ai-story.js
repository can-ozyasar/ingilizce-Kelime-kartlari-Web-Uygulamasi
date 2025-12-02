// ai-story.js

// DOM Elementleri
const apiKeyInput = document.getElementById('api-key-input');
const aiWordListDiv = document.getElementById('ai-word-list');
const selectAllCheckbox = document.getElementById('select-all-words');
const btnGenerateStory = document.getElementById('btn-generate-story');
const storyResult = document.getElementById('story-result');
const storyContent = document.getElementById('story-content');
const storyTranslation = document.getElementById('story-translation');

// Değişkenler
let kullaniciKelimeleri = [];

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    verileriYukle();
    kelimeListesiniOlustur();
});

// Verileri LocalStorage'dan Çek
function verileriYukle() {
    // API Key
    const savedKey = localStorage.getItem('gemini-api-key');
    if(savedKey) apiKeyInput.value = savedKey;

    // Kelimeler (Ana uygulamadan gelen veriler)
    const savedWords = localStorage.getItem('kelime-kartlari-ozel-kelimeler');
    if (savedWords) {
        try {
            kullaniciKelimeleri = JSON.parse(savedWords);
        } catch (e) {
            console.error("Kelime verisi hatalı", e);
            kullaniciKelimeleri = [];
        }
    }
}

// Kelime Listesini Ekrana Bas
function kelimeListesiniOlustur() {
    aiWordListDiv.innerHTML = '';

    if (kullaniciKelimeleri.length === 0) {
        aiWordListDiv.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-circle fs-2 d-block mb-2"></i>
                Listenizde favori kelime bulunamadı.<br>
                <a href="index.html" class="btn btn-sm btn-outline-primary mt-2">Kartlara Git ve Ekle</a>
            </div>`;
        btnGenerateStory.disabled = true;
        return;
    }

    btnGenerateStory.disabled = false;

    kullaniciKelimeleri.forEach((kelime, index) => {
        const div = document.createElement('div');
        div.className = 'form-check py-1';
        div.innerHTML = `
            <input class="form-check-input kelime-secim-cb" type="checkbox" value="${kelime.ingilizce}" id="w-${index}" checked>
            <label class="form-check-label" for="w-${index}">
                <strong>${kelime.ingilizce}</strong> <span class="text-muted small">(${kelime.turkce})</span>
            </label>
        `;
        aiWordListDiv.appendChild(div);
    });
}

// Tümünü Seç / Kaldır
selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.kelime-secim-cb');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// API Key Kaydetme
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('gemini-api-key', apiKeyInput.value.trim());
});

// HİKAYE OLUŞTURMA FONKSİYONU
btnGenerateStory.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Lütfen Google Gemini API anahtarını girin!");
        return;
    }

    // Seçili kelimeleri topla
    const secilenKelimeler = Array.from(document.querySelectorAll('.kelime-secim-cb:checked'))
        .map(cb => cb.value);

    if (secilenKelimeler.length === 0) {
        alert("Lütfen en az bir kelime seçin!");
        return;
    }

    const seviye = document.getElementById('story-level').value;
    const konu = document.getElementById('story-topic').value || "Günlük yaşam";

    // UI - Yükleniyor Modu
    setLoading(true);

    const prompt = `
        Sen bir İngilizce öğretmenisin. Aşağıdaki parametrelere göre kısa bir hikaye yaz.
        
        Seviye: ${seviye}
        Konu: ${konu}
        Kullanılacak Kelimeler: ${secilenKelimeler.join(', ')}
        
        Kurallar:
        1. Hikaye akıcı ve dil bilgisi açısından doğru olsun.
        2. "Kullanılacak Kelimeler" listesindeki kelimeleri hikaye içinde <strong> etiketiyle kalınlaştır (Örn: <strong>apple</strong>).
        3. Yanıtı SADECE geçerli bir JSON formatında ver. Başka bir açıklama yazma.
        
        JSON Formatı:
        {
            "story": "İngilizce hikaye metni buraya...",
            "translation": "Hikayenin Türkçe çevirisi buraya..."
        }
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        let textResponse = data.candidates[0].content.parts[0].text;
        // Markdown temizliği
        textResponse = textResponse.replace(/```json|```/g, '').trim();
        
        const result = JSON.parse(textResponse);

        // Sonuçları Göster
        storyContent.innerHTML = result.story;
        storyTranslation.textContent = result.translation;
        storyResult.classList.remove('d-none');
        
        // Ekrana kaydır
        storyResult.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Hata:", error);
        alert("Hata oluştu: " + error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    
    if (isLoading) {
        btnGenerateStory.disabled = true;
        btnText.textContent = "Yazılıyor...";
        btnLoading.classList.remove('d-none');
        storyResult.classList.add('d-none');
    } else {
        btnGenerateStory.disabled = false;
        btnText.textContent = "🚀 Hikayeyi Yaz";
        btnLoading.classList.add('d-none');
    }
}