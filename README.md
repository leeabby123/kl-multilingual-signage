# KL Multilingual Public Signage Capstone

**Course:** AQC7015 Digital Humanities · University of Malaya · Semester 2, 2025/2026
**Lecturer:** Dr. Ali Fauzi Bin Ahmad Khan
**Team:** Group 5 — LIAO RUIXUAN · WEI JITAO · CHEN MEILIN · WEI HONGHAI · LI BINGYI

A digital humanities study of **60 multilingual signs across 4 districts of Kuala Lumpur** (Petaling Street, Little India, Bukit Bintang, Kampung Baru), framed by Malaysia's National Language Act 1963/67 (30% rule) and analyzed through a three-layer framework: state discourse (Bahasa Melayu, top-down), community life (Chinese · Tamil, bottom-up), and economic pragmatism (English).

**Live URL:** `https://leeabby123.github.io/kl-multilingual-signage/`

---

## Site Architecture

```
                  顶部页 (Top — National Discourse · Navy + Gold)
                       ↑
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  中间页 (Middle — Landing · Entry · Cream)
                  ← page opens here by default
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                       ↓
                  底部页 (Bottom — Civilian Languages · Warm)

                       ↕ Hub button on top + bottom

                  Hub (60-cluster KL map · 8 findings)
                       ↓
                  5 secondary pages (left sidebar):
                  · About    · Timeline
                  · Sources  · Members    · Acknowledgements
```

**5 languages supported** (switcher on secondary pages only):
- 🔴 ZH 华语 · 🟠 TA தமிழ் · 🟢 MS Bahasa Melayu · 🔵 EN English · ⚪ Jawi جاوي

---

## File Structure

```
/
├── index.html                — SPA with 3 sections (top / middle / bottom)
├── pages/
│   ├── hub.html              — Hub page (8 finding buttons + KL map)
│   ├── about.html            — Research questions + 3-layer framework
│   ├── sources.html          — Sampling method + field definitions
│   ├── members.html          — 5 team members + roles
│   ├── timeline.html         — 6-node project timeline
│   └── acknowledgements.html — Dedications
├── assets/
│   ├── svg/
│   │   ├── middle-garden.svg — Landing garden visual (4-lang title + 5-color flowers)
│   │   └── bunga-pair.svg    — Green Malay + gray Jawi pair
│   └── photos/               — 60 signboard photographs (KB_01.jpg ... LI_15.jpg)
├── data/
│   ├── signs.json            — 60 signs metadata (English, from Excel)
│   └── content.json          — 5-language UI text + finding labels
├── css/
│   ├── tokens.css            — Design tokens (colors, fonts, spacing)
│   └── main.css              — Layout + components
├── js/
│   ├── main.js               — SPA scroll navigation
│   └── i18n.js               — 5-language switcher logic
└── README.md
```

---

## Local Preview

GitHub Pages requires a web server (file paths break with `file://`). Locally:

```bash
# Python 3 (preinstalled on macOS)
python3 -m http.server 8000

# Then open: http://localhost:8000
```

---

## Deployment (GitHub Pages)

1. Visit https://github.com/leeabby123/kl-multilingual-signage
2. **Add file → Upload files** → drag ALL files from this folder
3. Commit changes
4. **Settings → Pages** → Branch: `main` `/(root)` → Save
5. URL live in 1–2 minutes at `https://leeabby123.github.io/kl-multilingual-signage/`

---

## Visual Design Sources

- **Middle page** (`homepage_garden_final.svg`): full landing visual with 4-language title plaque, 5-colored hibiscuses, KL city silhouette, palm trees, watercolor garden — designed by team
- **Top page** (`top_page_navy_mockup.html` adapted): navy + gold national discourse layout — UUK 3 Bahasa Iklan legal text with bunga raya pair — designed by team

## Phase 2 Pending

- Bottom page final visual (KL map base + 60 hibiscus clusters)
- Hub page final visual (interactive map with click-to-modal)
- 5 secondary pages content injection from `content.json`
- 60 photos uploaded to `assets/photos/`
- Scroll animations (GSAP ScrollTrigger)
- 8 finding modals with chart visualizations
