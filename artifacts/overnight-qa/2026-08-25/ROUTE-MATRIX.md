# Production route and browser matrix

| Route/surface | Method | Status | Evidence |
| --- | --- | --- | --- |
| `/` | HTTP | Passed | 200; production deployment Ready. |
| `/downloads` | HTTP + Edge | Passed | 200; title correct; Windows download, Windows 10/11 x64 copy, and `v0.2.15` rendered. |
| `/ai` | HTTP + authenticated Edge | Passed | 200; workspace rendered `Connected` and selected `Place1 (2)`; no update/reinstall prompt. |
| `/docs` | HTTP | Passed | 200. |
| `/docs/installation` | HTTP | Passed | 200. |
| `/docs/studio-plugin` | HTTP | Passed | 200; canonical connector Help destination. |
| `/pricing` | HTTP | Passed | 200. |
| `/legal/privacy` | HTTP | Passed | 200. |
| `/connector/latest.json` | HTTP | Passed | 200; same-origin manifest version 0.2.15. |
| `https://api.nexusrbx.com/health` | HTTP | Passed | 200. |
| Public release feed | Ranged HTTP | Passed | Ten manifest/updater/checksum/versioned/stable/compatibility endpoints returned 206. |
| Vercel deployment | Platform | Passed | `dpl_HWV4J9vUJyKLk6GCaWysFpVPjVcX`, Production, Ready, 3m. |
| Railway backend | Platform | Passed | `ac077a71-1e24-4fc9-8c7a-11ed7acc3729`, commit `399a6a8c`, Success. |
| Exact-window Studio binding | API + Edge + Windows | Passed | Authenticated binding, unpublished identity, active window, project, session, and connection checks all true. |
| Roblox Studio windows | Windows observation | Passed | QA file and separate `Place1` window both remained open; only QA file was targeted. |

The `/ai` route intentionally serves a small HTML shell before authenticated client rendering; browser DOM evidence, not raw HTML size, was used for its final state.
