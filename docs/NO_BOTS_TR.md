# JOA Light | Botsuz GitHub deposu

Bu sürümde **GitHub Actions iş akışı** ve **Dependabot sürüm güncelleme ayarı** yoktur.

- `.github/workflows/` ve `.github/dependabot.yml` dosyaları paketlenmez.
- `.github/ISSUE_TEMPLATE/` ve `.github/CODEOWNERS` normal GitHub şablonlarıdır; bağımsız bir bot başlatmaz.
- GitHub deposunun kendi ayarları (örneğin Dependabot security updates) ZIP içinden kapatılamaz. Otomatik güvenlik PR'lerini de istemiyorsanız GitHub deposunda Settings → Security and quality / Code security bölümünde ilgili ayarı kapatın.
- Önceki Actions çalıştırmaları ve kapalı Pull Request kayıtları GitHub geçmişinde görünebilir; yeni ZIP bunları silmez.
- Mevcut GitHub Desktop deposunda güncelleme yapacaksanız `.git/` klasörünü **koruyun**. ZIP dosyasının içinde `.git/` yoktur. Eski `.github/workflows/ci.yml` ve `.github/dependabot.yml` dosyalarını mevcut çalışma kopyasında ayrıca silin; ZIP'i üzerine çıkarmak eskiden kalan dosyaları silmez.

## Yayından önce yerelde kontrol

```bash
npm ci --ignore-scripts
npm run security:check
npm test
npm audit --audit-level=high
```

İnternete bağlı `npm audit` güncel bağımlılık uyarılarını sorgular. `npm test`, uygulamayı derler ve regresyon testlerini yürütür. Bu kontrolün yapılması kullanıcıya ait Obsidian kasasında test yapmanın yerine geçmez.
