# JOA Light v1.0.0 | Güvenlik ve çalışma doğrulaması

**Tarih:** 11 Ekim 2026  
**Kapsam:** Kullanıcı tarafından sağlanan `JOA-Light-v1.0.0-GitHub-Clean(1).zip` dosyasından çıkarılan kaynaklar.  
**Değerlendirme türü:** Yerel statik kod incelemesi, otomatik test, saldırgan veri/arıza senaryosu, tarayıcı tabanlı Obsidian API simülasyonu, paket bütünlüğü. **Dışarıdan bağımsız denetim değildir.**

## Sonuç

| Doğrulama | Bulgular |
|---|---|
| TypeScript derleme ve Node testleri | **184/184 geçti** |
| Güvenlik negatif senaryoları | Bozuk dosya, tehlikeli veri, hasarlı payload, kısaltma ve dosya işlemi hataları sınandı |
| Windows benzeri dosya sistemi semantiği | Mevcut hedefe `rename` reddi simüle edildi; kurtarma kopyası koruma kontrolleri geçti |
| Chromium arayüz testi | Üretilen eklenti + CSS + gerçek paket görselleriyle F3, iki sis kontrolü, nota yazma, sekme, Esc; yakalanmamış hata yok |
| SQLite bütünlüğü | Örnek boş ve yazılı veritabanları için Python `sqlite3` `PRAGMA integrity_check` sonucu `ok` |
| Paket taraması | Veri dosyası ve yedek yok; derlenmiş ana dosyalar, 240 ses kaydı ve SHA-256 kayıtları doğrulanıyor |
| npm bağımlılık denetimi | Çevrimdışı kayıtlar sıfır uyarı; **güncel çevrimiçi denetim yapılmadı** |
| Gerçek Windows'ta Obsidian | **Yapılmadı**: mevcut çalışma ortamı Linux |
| Dış bağımsız denetçi/sızma testi | **Yapılmadı** |

## Uygulanan iki sağlamlaştırma

1. **Yazma öncesi şema doğrulaması:** `FixedPayloadSqliteCodec.writeState()` artık değişmiş karakter/kayıt türü, yasak portre yolu, limit dışı içerik gibi durumları dosyaya yazmadan önce reddediyor. Bu durumun sonradan kullanıcı veritabanını açılamaz hale getirmesinin önüne geçilmesi hedefleniyor.
2. **Payload sonu doğrulaması:** boş kayıt bölgesinde veya bildirilen JSON uzunluğunun ardından sıfır olmayan artık baytlar bulunursa dosya reddediliyor; kendiliğinden temizleme/sıfırlama yapılmıyor.

## Neler gerçekten test edildi?

- İlk kurulumda boş veritabanı açma; karakter, NPC ve SQLite kayıt değişiklikleri; açılışta geçerli veriyi koruma.
- `.tmp`, `.bak`, `.swap` senaryoları ve dosya `read` / `write` / `rename` / `remove` arızalarında eski verinin veya kurtarma kopyasının korunması.
- Şema bozulması, geçersiz resim yolu, hatalı JSON uzunluğu, beklenmedik payload artığı, SQLite başlık/şablon bozulması.
- Tarayıcıdaki gerçek derlenmiş `main.js` ile oluşturulan modal, metnin gerçek DOM olayıyla not editörü simülasyonuna eklenmesi, D240 akışının kapanması, medya dosyalarının okunması, sekmeler ve iki sliderın görünmesi. **Simülasyon gerçek Obsidian uygulaması değildir; gerçek ses çıkışı sınanmamıştır.**
- GitHub sürümünün özel `data.json`, veritabanı, `art/`, kimlik bilgileri veya kişisel Obsidian kasasını paketlememesi.

## Yayın öncesi gerçekten Windows üzerinde yapılması gereken kabul testi

Bu işlemler **henüz uygulanmış değildir**. Bir **yedek/test kasasında** kullanıcı tarafından veya erişimi olan bir test uzmanı tarafından yürütülmelidir.

1. Güncel Obsidian masaüstünde **yeni ve boş bir kasa** oluştur. İstersen Windows PowerShell üzerinden `scripts/windows-create-test-vault.ps1` ile **yalnız TEMP dizininde yeni, bağımsız test kasası hazırlayabilirsin**; bu betik Obsidian uygulamasını çalıştırıp test sonuçlarını doğrulamaz. Kendi gerçek kasanı kullanma.
2. ZIP içindeki `joa-frp-writer/` klasörünü `TEST-KASASI/.obsidian/plugins/` konumuna çıkar; `main.js`, `manifest.json`, `styles.css`, `audio/MV1.mp3`–`MV240.mp3`, `assets/anlati-panel.png`, `background-images/default.webp` bulunduğunu doğrula.
3. Obsidian içinde eklentiyi etkinleştir; yeni Markdown notu aç; F3 ile sahne masasını aç/kapat. Escape, focus, modal görünümü, pencere tam ekranından normal moda geri dönme davranışlarını kontrol et.
4. Hem **Diyar Sisi** hem **Anlatı Sisi** sliderlarını değiştir. Birini değiştirmenin diğerini etkilemediğini, kaydedilip yeniden açıldığını kontrol et. Arka plan, tema ve görüntü sığdırma seçeneklerini dene.
5. Meggy için konuşma yaz, D240 olayının nota **tek satırda ve doğru biçimle** işlendiğini, sesinin gerçek hoparlörden duyulduğunu kontrol et. Diğer konuşmacının D240 kullanmadığını doğrula.
6. Ana karakter, NPC, araç ve mekân ekle, düzenle, yaşam durumunu değiştir, **her türü** silmek için onay penceresini sınayıp kalan kayıtları kontrol et.
7. Portre ekle; karakter çantasını kaydet; Obsidian'ı tamamen kapatıp aç, verilerin korunduğunu ve not imlecinin geri yüklendiğini kontrol et.
8. Test kasasını kopyalayıp orada `.tmp`, `.bak`, `.swap` kurtarma tatbikatı yap; **asıl kasada bozuk dosya deneyleri yapma**.
9. Bu bot içermeyen sürümde GitHub Actions bulunmuyor. Yayın öncesi bilgisayarda `npm ci --ignore-scripts`, `npm run security:check`, `npm test` ve **internete bağlıyken** `npm audit --audit-level=high` komutlarını elle çalıştır; hataları çözmeden kararlı sürüm ilan etme. Bağımsız güvenlik denetimi isteniyorsa dış bir uzman raporuna başvur.

## Sınırlar ve bilinçli kalan riskler

- SQLite içindeki içerik **şifreli değil**, veri kapasitesi yaklaşık 60 KiB ile sınırlı. `.bak` de özel veri taşıyabilir.
- `.tmp/.swap` değiştirme stratejisi iyi hata dayanımı sağlar ancak Windows/OneDrive/Obsidian dosya sistemi üzerinde **kesin atomiklik veya elektrik kesintisi garantisi yoktur**.
- Güvenli kod taraması tüm açıklara karşı sertifika değildir; diğer Obsidian eklentilerinin de yüksek erişim hakları bulunabilir.
- Tarayıcı testi Linux Chromium ve taklit Obsidian API üzerinden yürütüldü. Gerçek Obsidian entegrasyonu ya da Windows üzerinde kurulum onayı **değildir**.
- Eklenti halen **v1.0.0 public beta / pre-release** düzeyinde değerlendirilmelidir.
