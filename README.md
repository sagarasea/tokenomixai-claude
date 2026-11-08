# TokenomixAI untuk Claude Code

Menampilkan sisa kuota TokenomixAI tepat di bawah kotak input Claude Code, di terminal maupun di panel Claude Code VS Code:

```
tokenomixai plugin  #TKX-XXXXXX · sisa 3,8B dari 5B (76%) · aktif s.d. 12 Des
```

Angkanya diperbarui tiap menit. Saat sisa kuota 10% atau kurang, baris ini menambahkan "hampir habis, top up di tokenomixai.com", dan saat kuota habis atau masa aktif lewat, baris ini memberi tahu.

## Pasang

Cara termudah: jalankan installer TokenomixAI untuk Claude Code (lihat [tokenomixai.com/docs](https://tokenomixai.com/docs#install)). Installer mengisi API key dan memasang plugin ini kalau versi Claude Code kamu mendukungnya.

Manual, di dalam Claude Code:

```
/plugin install tokenomixai --marketplace sagarasea/tokenomixai-claude
```

Plugin membaca `ANTHROPIC_BASE_URL` dan `ANTHROPIC_AUTH_TOKEN` dari settings Claude Code. Kalau Claude Code kamu tidak memakai TokenomixAI, plugin diam.

## Privasi

API key hanya dikirim ke `https://api.tokenomixai.com/v1/quota` lewat HTTPS. Plugin tidak membaca prompt, kode, atau file kamu, dan tidak mengirim data lain ke mana pun. Kodenya pendek: [hooks/register.ts](hooks/register.ts).

## Lepas

```
/plugin uninstall tokenomixai@tokenomixai
```

---

English: shows your remaining TokenomixAI quota below the Claude Code input box (terminal and VS Code). Install with `/plugin install tokenomixai --marketplace sagarasea/tokenomixai-claude`. The API key is only sent to `https://api.tokenomixai.com/v1/quota`.
