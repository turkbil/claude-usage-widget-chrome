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

## Görseller — dev console'da nereye

Yerler: eklenti → **Store listing** sekmesi → **Graphic assets** bölümü.

Chrome'un belgesine göre (developer.chrome.com/docs/webstore/cws-dashboard-listing, 13 Kas 2026'da okundu):
- Ekran görüntüleri dile göre yüklenebilir: «provide a description, screenshots, and promotional video in the locales your extension supports».
- Tanıtım kutusu ve marquee dile göre yüklenemez: «The small tile and Marquee promo tile cannot be localized». Bu iki alana yalnız varsayılan dilin dosyası girer: `manifest.json` → `default_locale` = `en`.
- Belgede yerel görseli olmayan dilin neyi göreceği açıkça yazmıyor. Gösterim sırası yerel görselleri önce, genel görselleri sonra sayıyor; yani büyük olasılıkla genel görseller gösterilir. Bu yüzden genel (dil seçilmemiş) ekran görüntüsü alanına `en` görsellerini yükle.

| Konsol alanı | Ölçü | Dosya |
|---|---|---|
| **Store icon** | 128×128 | `store-assets/store-icon-128.png` (bütün diller için tek dosya) |
| **Screenshots** (dile göre; en çok 5; sırayla yükle) | 1280×800 | `store-assets/screenshots/<dil>/01-accounts.png` → `02-details.png` → `03-hide.png` |
| **Small promo tile** (dile göre değil) | 440×280 | `store-assets/promo/en/tile-440x280.png` |
| **Marquee promo tile** (dile göre değil) | 1400×560 | `store-assets/promo/en/marquee-1400x560.png` |

- `<dil>` klasör adı bu klasördeki `.md` dosyalarıyla aynıdır: en, tr, de, es, fr, it, nl, cs, ro, ru, uk, ja, ko, zh_TW, th.
- Öteki dillerin `promo/<dil>/` dosyaları mağazaya yüklenmez; sosyal medya, web sitesi gibi dile özel kullanımlar için hazır durur.
- Ekran görüntüleri: (1) bütün hesaplar, sıfırlama hakları açık · (2) açık hesabın ayrıntıları ve araç çubuğundaki simge · (3) hesabı gizle ya da sil.
- Yeniden üretmek için depo kökünde `node store-assets/shots/render.cjs` komutunu çalıştır. Yalnız birkaç dil için: `node store-assets/shots/render.cjs tr ja`. Kaynak tek şablondur: `store-assets/shots/shot.html` (popup `popup.html`'den gerçek kodla çizilir). Metinler `store-assets/shots/copy.json` dosyasındadır. Betik sonunda ölçüm özetini basar; `FAILS 0` görülmeli.
- Kökteki `store-assets/screenshots/*.png`, `promo-tile-440x280.png`, `store-marquee-1400x560.*` ve `store-0*.html` eski tasarımdır. Yükleme için kullanma.

## Dikkat

- Mağaza Markdown işlemez: metni olduğu gibi yapıştır; `▸` ve `•` işaretleri düz metin olarak kalır.
- Kısa açıklama alanı salt okunur görünüyorsa («from package») özet paketten gelir: `manifest.json` → `_locales/<dil>/messages.json` içindeki `app_description`. O zaman bu dosyalardaki kısa açıklamayı oraya da yaz (sınır yine 132 karakter) ve yeni paketi yükle.
- Kategori, tek amaç gerekçesi, izin gerekçeleri, gizlilik ve destek adresleri: `../listing.md` (yalnız İngilizce; **Privacy practices** sekmesine).
- Dil kodu ↔ mağaza dili: zh_TW = Chinese (Traditional), uk = Ukrainian, cs = Czech, ro = Romanian.
