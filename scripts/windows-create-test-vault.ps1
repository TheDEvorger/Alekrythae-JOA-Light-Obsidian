# JOA Light - disposable Windows Obsidian acceptance fixture.
# Creates a NEW vault under TEMP. Does not modify or open an existing vault.
# This is a preparation script, NOT proof of completed Windows/Obsidian testing.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$fixture = Join-Path $env:TEMP ('JOA-Light-TestVault-' + [guid]::NewGuid().ToString('N'))
$plugin = Join-Path $fixture '.obsidian\plugins\joa-frp-writer'
$required = @('main.js','manifest.json','styles.css','assets\anlati-panel.png','background-images\default.webp')
foreach ($rel in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $rel) -PathType Leaf)) {
        throw "Required plugin file missing: $rel"
    }
}
$clips = @(Get-ChildItem -LiteralPath (Join-Path $source 'audio') -Filter 'MV*.mp3' -File)
if ($clips.Count -ne 240) { throw "Expected 240 MP3 files; got $($clips.Count)" }
foreach ($n in 1..240) {
    if (-not (Test-Path -LiteralPath (Join-Path $source ("audio\MV$($n).mp3")))) { throw "Missing canonical MV$($n).mp3" }
}
New-Item -ItemType Directory -Path $plugin -Force | Out-Null
foreach ($sub in @('audio','assets','background-images')) {
    New-Item -ItemType Directory -Path (Join-Path $plugin $sub) -Force | Out-Null
}
foreach ($rel in $required) {
    Copy-Item -LiteralPath (Join-Path $source $rel) -Destination (Join-Path $plugin $rel)
}
foreach ($clip in $clips) { Copy-Item -LiteralPath $clip.FullName -Destination (Join-Path $plugin 'audio') }
$pluginsFile = Join-Path $fixture '.obsidian\community-plugins.json'
[System.IO.File]::WriteAllText($pluginsFile, '["joa-frp-writer"]', (New-Object System.Text.UTF8Encoding($false)))
$sample = @'
# JOA Light test notes

This is a disposable test vault, not a personal writing vault.

- [ ] Open this Markdown note and press F3.
- [ ] Confirm Diyar Sisi and Anlatı Sisi can be adjusted separately.
- [ ] Confirm the illustration, background and 240 bundled audio clips are available.
- [ ] Insert a Meggy D240 line; verify the audio actually plays.
- [ ] Add, edit, delete characters / NPC / vehicle / place and check persistence after restarting Obsidian.
- [ ] Verify Escape, focus and fullscreen exit behaviour.
'@
Set-Content -LiteralPath (Join-Path $fixture 'JOA Acceptance.md') -Value $sample -Encoding UTF8
$entry = Get-Content -LiteralPath (Join-Path $source 'SHA256SUMS.txt') | Where-Object { $_ -match '\s{2}main\.js$' } | Select-Object -First 1
if (-not $entry) { throw 'SHA256SUMS.txt entry for main.js not found' }
$expected = ($entry -split '\s{2}')[0].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath (Join-Path $plugin 'main.js') -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expected -ne $actual) { throw 'Copied main.js checksum mismatch' }
Write-Host "Disposable Obsidian vault prepared: $fixture"
Write-Host 'Open this folder as a new vault in Obsidian Desktop, enable the plugin if necessary, and follow JOA Acceptance.md.'
Write-Host 'The script does not certify app compatibility or run a security penetration test.'
