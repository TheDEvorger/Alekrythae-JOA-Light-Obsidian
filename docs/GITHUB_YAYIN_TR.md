# JOA Light | GitHub'a güvenli ilk yayın kılavuzu

Bu klasör, GitHub depo köküne yerleştirilecek **kaynak kod + derlenmiş eklenti + tanıtım belgeleri** dağıtımıdır. ZIP'in içinde yalnızca bir `joa-frp-writer/` klasörü vardır; kişisel kullanıcı verileri bulunmaz.

## 1. Önce doğrula

- `node --version`: Node.js 22 ve üzeri kullanılmalı.
- `npm ci --ignore-scripts`: Kilitli TypeScript bağımlılığını kur.
- `npm test`: Derle ve tüm regresyon testlerini çalıştır.
- `npm run security:check`: Hassas dosya izi, dosya bütünlüğü ve dağıtım kontrollerini çalıştır.
- Kaynakta şahsi hikâye, gerçek kullanıcı ekran görüntüsü, anahtar veya istemeden eklenmiş varlık bulunmadığından emin ol.

## 2. GitHub Desktop üzerinden depoyu oluştur

1. Yeni ve boş bir depo oluştur. İstersen adı `JOA-Light-Obsidian` olsun.
2. ZIP'in **içindeki `joa-frp-writer/` klasörünün içeriğini** depo köküne taşı. `README.md`, `.gitignore`, `LICENSE` ve `manifest.json` doğrudan kökte olmalı. ZIP'i depoda tek dosya olarak tutma.
3. İlk commit'ten önce **Changes** listesini dikkatlice gözden geçir; özellikle `data.json`, `sqlite/`, `art/`, `.obsidian/`, token, şifre ve kişisel notlar **olmamalı**.
4. `npm run security:check` çalıştır. Gerekirse `git ls-files` ile önceden izlenen dosyaları kontrol et.
5. Depoya gönder. `main` korumasını, özel güvenlik bildirimi ve secret scanning seçeneklerini GitHub Settings üzerinden gözden geçir. **Bu sürüm GitHub Actions/Dependabot botu kurmaz.** Otomatik güvenlik güncellemesi PR istemiyorsan GitHub güvenlik ayarından ayrıca kapat.

> `.gitignore` yalnızca eklenmemiş dosyalara etki eder. Daha önce gönderilmiş gizli dosyalar geçmişte kalabilir; bu durumda güvenli temizlik ve varsa gerçek anahtarların değiştirilmesi gerekir.

## 3. Sürüm / release

`npm test` sonrasında yeniden kullanılabilir tek ZIP üretmek için Python 3 ile:

```bash
python scripts/create-distribution.py
```

Bu komut koruma denetimlerini çalıştırır, **tek kök klasörlü ZIP** hazırlar ve ZIP'i CRC ile kontrol eder. Release açıklamasında `RELEASE_NOTES.md` kullanılabilir. Resmî Obsidian Community Plugins listesine kabul edilmiş olması bu işlemle garanti edilmez.

`main.js`, `manifest.json`, `styles.css` dosyaları klasik Obsidian giriş dosyalarıdır. Ancak **ses, anlatı resmi ve varsayılan arka plan** gerektiği için eklentinin tam kurulumu, bunları da içeren tek ZIP ile yapılmalıdır.

## 4. Temiz kurulum ile güncelleme arasındaki fark

- **Yeni kurulum:** ZIP'te boş/kişisel bir SQLite dosyası dahi yoktur. İlk çalıştırmada temiz veritabanı oluşturulur.
- **Güncelleme:** Kullanıcının `data.json`, `sqlite/`, `art/` ve özel `background-images/` dosyaları korunur. Bunlar silinmez, git'e gönderilmez.
- **Test kasası:** Şüpheli kurulum, veritabanı kurtarma ve kapsamlı Windows uyumluluğu gerçek kişisel kasada değil, ayrı deneme kasasında sınanmalıdır.

Detaylar: [README](../README.md) · [Güvenlik](../docs/REPOSITORY_SECURITY.md) · [Sürüm rehberi](./RELEASE_GUIDE.md).
