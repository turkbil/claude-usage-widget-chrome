# Mağaza metni — dev console'a yapıştırma

Her dil bir dosya: `<dil>.md` (en, tr, es, fr, de, it, ru, ja, ko, zh_TW, th, nl, cs, uk, ro).
Her dosyada aynı üç başlık var: Item name · Short description · Detailed description.

## Adımlar

1. chrome.google.com/webstore/devconsole → eklenti → **Store listing** sekmesi.
2. Üstteki dil seçicide **English** ile başla; diğerleri için **Add language / Dil ekle** → dili seç.
3. Her dilde:
   - **Item name / Ad** → `Claude Usage Widget` (çevrilmez).
   - **Summary / Short description** → dosyadaki «Short description» satırı (en çok 132 karakter).
   - **Description / Detailed description** → «Detailed description» başlığının altındaki her şey, son satıra kadar.
4. **Save draft**, sonra **Submit for review**.

## Dikkat

- Mağaza Markdown işlemez: metni olduğu gibi yapıştır; `▸` ve `•` işaretleri düz metin olarak kalır.
- Kısa açıklama alanı salt okunur görünüyorsa («from package») özet paketten gelir: `manifest.json` → `_locales/<dil>/messages.json` içindeki `app_description`. O zaman bu dosyalardaki kısa açıklamayı oraya da yaz (sınır yine 132 karakter) ve yeni paketi yükle.
- Kategori, tek amaç gerekçesi, izin gerekçeleri, gizlilik ve destek adresleri: `../listing.md` (yalnız İngilizce; **Privacy practices** sekmesine).
- Dil kodu ↔ mağaza dili: zh_TW = Chinese (Traditional), uk = Ukrainian, cs = Czech, ro = Romanian.
