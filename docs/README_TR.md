# JOA Light | Türkçe Tanıtım ve Kurulum

**JOA Light**, ana [JOA | Journey of Adventure](https://github.com/TheDEvorger/Alekrythae-Meggy-s-JOA-Journey-Of-Adventure) projesinin **hikâye odaklı Obsidian sürümüdür**. Temel amaç, hikâyeyi Markdown notunda tutarken karakter bilgilerine, portrelere ve konuşmalara F3 ile hızlı erişmektir.

![JOA Light fantastik tanıtım kapağı; gerçek program ekran görüntüsü değildir](../assets/joa-light-cover.webp)

**Durum:** v1.0.0 Public Beta • yalnız masaüstü • özel lisanslı, kaynak kodu görüntülenebilir yazılım.

## Neler sunuyor?

- **F3:** Aktif not üzerinden hikâye çalışma masası açılır; ESC ile kapatılır. Seçici solda, onay düğmesi sağda; yazma kutusu büyük ve çok satırlı kalır.
- **Konuşma:** Meggy, ana karakter, NPC, araç veya diğer konuşmacı seçilerek sade Markdown konuşma satırı eklenir.
- **Karakterler:** Ad ⟡ Soyad, portre, yaşam durumu ve metin tabanlı çanta kayıtları.
- **Yaşayan / Ölü:** Karakterleri ve varlıkları yaşam durumuna göre listeleme, düzenleme ve isim kopyalama.
- **Görünüm:** 24 farklı fantastik tema, arka plan seçme, iki bağımsız bulanıklık ayarı, **Diyar Sisi** ve **Anlatı Sisi** (her biri 0–24 px), görüntüyü kırpmadan sığdırma / oranı koruyarak yakınlaştırma seçenekleri; tercihler `data.json` içine kaydedilir.
- **Ses:** Meggy notu başarıyla işlediğinde F3 kapanır, D240 sonucuna karşılık gelen özgün `audio/MV1.mp3`–`MV240.mp3` dosyasından biri otomatik oynar. Diğer karakterler ses oynatmaz. Gerekirse son kaydı tekrar oynatma komutu vardır.
- **D240:** Yalnızca **kanonik Meggy** konuştuğunda 1–240 arasında zar atılır ve **özgün 240 cümleden** seçilen numara birebir kullanılır. D240 olayı 24 ayrı etiket türünden birini bağımsız seçer; sonuç aynı satırda kalır.
- **İmleç:** F3 açılıp kapanınca ve Obsidian yeniden açıldığında not bazındaki son yazı konumunu hatırlama.

## Kurulum

1. Obsidian kasanı (vault) yedekle.
2. Tek ZIP'i `.obsidian/plugins/` klasörüne çıkart. ZIP içindeki **tek `joa-frp-writer/` klasörü** doğrudan buraya gelmeli.
3. Kişisel `sqlite/`, `art/` ve `data.json` dosyalarını herkese açık GitHub deposuna yükleme.
4. Obsidian'ı yeniden başlat, topluluk eklentilerinden **JOA Light**'ı etkinleştir, bir `.md` notu aç ve **F3** tuşuna bas.

> **Önemli:** `main.js` derlenmiş dağıtım dosyasıdır. Gerçek geliştirme kodları `src/` altında modüler TypeScript dosyalarındadır. Obsidian'ın yüklediği dosyayı elle değiştirmeye gerek yoktur.

## Saklama ve sınırlar

- Hikâye metni `.md` notuna yazılır.
- Karakterler, çantalar ve listeler `sqlite/inventory.sqlite` içinde tutulur.
- Portreler `art/`, imleç ve görünüm ayarları `data.json`, seçilen arka planlar `background-images/` içindedir.
- Güncel SQLite düzeni yaklaşık **60 KiB** JSON payload sınırı taşır; sınırsız ilişkisel SQLite değildir.
- Yalnız masaüstü desteklenir. Gerçek kullanıcı ortamındaki davranışlar her makinede doğrulanmış değildir.

## Lisans

**TheDEvorger Universal Proprietary Software License v1.3.** Lisansın tam ve değiştirilmemiş metni kökteki [`LICENSE`](../LICENSE) dosyasındadır. **Açık kaynak / MIT değildir.** Kişisel kullanım dışında profesyonel, ticari, kurumsal ve yeniden dağıtım izinleri ayrıca kısıtlıdır. Ek izin gerektiğinde lisanstaki iletişim adresini kullan.

Ek bilgiler: [İngilizce README](../README.md) · [Kullanım rehberi](./USER_GUIDE.md) · [Sürüm notları](../CHANGELOG.md) · [Bilinen sınırlar](./ROADMAP.md)
