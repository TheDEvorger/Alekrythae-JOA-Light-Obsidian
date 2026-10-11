# JOA Light v1.0.0 | Tek klasörlü tam kurulum

## Kurulum

1. Obsidian'ı tamamen kapatın.
2. ZIP'in içindeki **joa-frp-writer** klasörünü kasanızın `.obsidian/plugins/` dizinine çıkarın.
3. Klasörde `main.js`, `manifest.json` ve `styles.css` dosyalarının doğrudan bulunduğunu doğrulayın.
4. Kişisel **sqlite/**, **art/** ve **data.json** dosyalarını GitHub’a yüklemeyin; bu arşivde bulunmazlar.
5. Obsidian'ı açın, Topluluk Eklentileri'nde JOA Light'ı etkinleştirin; F3'e basın.

## Mimari ve kurulum dosyaları

- `main.js`: Obsidian'ın mecburen yüklediği tek giriş paketi; el ile düzenlenmez, TypeScript modüllerinden otomatik oluşturulur.
- `manifest.json`: eklenti kimliği.
- `styles.css`: Obsidian'ın yüklediği, alt CSS modüllerinden otomatik oluşturulan stil paketi.
- `src/`: modüler TypeScript kaynak kodu.
- `styles/`: görevlerine göre ayrılmış küçük CSS kaynak dosyaları.
- `tests/`: kaynak ve davranış kontrolleri, özgün D240 referans dosyası.
- `ARCHITECTURE.md` / `MODULES.md`: sorumluluk haritası ve bilinen sınırlamalar.
- `package.json`, `package-lock.json`, `tsconfig.json`, `build-release.cjs`, `clean.cjs`: kaynaklardan kurulum paketi üretme araçları.

## Değişiklik yapma

Kaynağı `src/` ve `styles/` içinde değiştirin. Geliştirme ortamında `npm test` çalıştırmak modülleri derler, `main.js`/`styles.css` üretir ve testleri çalıştırır. `build-release.cjs`, kökteki `main.js` ve `styles.css` dosyalarını da günceller. Derlenen kurulum çıktısı ayrıca `release/joa-frp-writer/` altındadır.

## Dürüst sınır

Obsidian'ın standart eklenti yükleyicisi doğrudan `src/*.ts` dosyalarını çalıştırmaz. Bunlar okunabilir ve düzenlenebilir **kaynak dosyalarıdır**. Tek büyük `main.js` bir derleme çıktısıdır, geliştirme kaynağı değildir. Kodun mimarisi, fiziksel dosya sayısından bağımsız olarak ayrıca denetlenmelidir. SQLite veri biçimi hâlâ yaklaşık 60 KiB kapasiteli sabit JSON yükü barındırır.
