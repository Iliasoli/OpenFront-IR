<div align="center">

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="proprietary/images/OpenFrontLogoDark.svg">
    <source media="(prefers-color-scheme: light)" srcset="proprietary/images/OpenFrontLogo.svg">
    <img src="proprietary/images/OpenFrontLogo.svg" alt="OpenBI / OpenFront-IR Logo" width="320">
  </picture>

  <h1>🌍 OpenBI (OpenFront-IR)</h1>

  <p>
    <strong>An Enhanced Online Real-Time Strategy & Geopolitical Warfare Game</strong><br>
    <strong>بازی استراتژی هم‌زمان (RTS) آنلاین، نبردهای ژئوپلیتیکی و مدیریت اقتصاد پیشرفته</strong>
  </p>

  <p>
    <a href="#-english-documentation"><strong>🇬🇧 English Documentation</strong></a>
    &nbsp;•&nbsp;
    <a href="#-مستندات-فارسی"><strong>🇮🇷 مستندات فارسی</strong></a>
    &nbsp;•&nbsp;
    <a href="#-whats-new-in-openbi--openfront-ir"><strong>✨ New Features</strong></a>
    &nbsp;•&nbsp;
    <a href="#-ویژگیهای-جدید-و-اختصاصی"><strong>🚀 قابلیت‌های جدید</strong></a>
  </p>

  <p>
    <img src="https://github.com/openfrontio/OpenFrontIO/actions/workflows/ci.yml/badge.svg" alt="CI Status">
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D24.15.0-339933?logo=node.js&logoColor=white" alt="Node.js >= 24.15.0"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0"></a>
    <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite 8.0"></a>
    <a href="https://www.gnu.org/licenses/agpl-3.0"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL v3"></a>
    <a href="https://creativecommons.org/licenses/by-sa/4.0/"><img src="https://img.shields.io/badge/Assets-CC%20BY--SA%204.0-lightgrey.svg" alt="Assets: CC BY-SA 4.0"></a>
  </p>

</div>

---

# 🇬🇧 English Documentation

## 📖 Table of Contents

- [Overview](#-overview)
- [What's New in OpenBI / OpenFront-IR](#-whats-new-in-openbi--openfront-ir)
  - [🏦 International Bank & Global Loan System](#-international-bank--global-loan-system)
  - [🪖 Mechanized Warfare: Tank Factories & Tank Divisions](#-mechanized-warfare-tank-factories--tank-divisions)
  - [⛏️ Resource Extraction & Rail Supply/Demand Economy](#️-resource-extraction--rail-supplydemand-economy)
  - [🤖 Strategic AI Overhaul](#-strategic-ai-overhaul)
- [Core Gameplay & Structures](#-core-gameplay--structures)
- [Architecture & Tech Stack](#️-architecture--tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Game](#-running-the-game)
- [Development, Testing & Benchmarking](#️-development-testing--benchmarking)
- [License](#-license)

---

## 🌐 Overview

**OpenBI (`OpenFront-IR`)** is a feature-rich online real-time strategy (RTS) game built on top of [OpenFront.io](https://openfront.io/) (originally a rewrite of [WarFront.io](https://github.com/WarFrontIO)). Players compete across dozens of real-world geographical maps to expand territory, build industrial and military infrastructure, manage complex rail and maritime trade networks, forge or betray diplomatic alliances, and deploy land, naval, and nuclear forces.

This repository introduces deep economic, financial, and mechanized warfare systems alongside complete **English** and **Persian (فارسی)** localization.

---

## ✨ What's New in OpenBI / OpenFront-IR

### 🏦 International Bank & Global Loan System

Dominate the global financial system by establishing the **International Bank**:

- **Construction Requirements**: Unlocks after **10 minutes (`600s`)** of match time. Only the **largest player on the map** (by territory) holding at least **500M Gold** can construct the International Bank for **250M Gold**.
- **Global Uniqueness & Relocation**: Only **one** International Bank can exist in a match. If the tile holding the Bank is conquered while the owner still controls other territory, the Bank **automatically relocates** to another tile owned by the Bank owner rather than being captured. It is only destroyed if the owner is completely eliminated.
- **Player & AI Loans**: Any living player (Human or AI) can request a loan from the International Bank owner. The Bank owner can approve or reject loan requests and customize both the **loan amount** and **repayment duration (`5` to `3600` seconds)**.
- **Automatic Repayment**: When the loan timer expires, the full principal is automatically deducted from the borrower (even if it drives their balance negative) and credited back to the lender.

### 🪖 Mechanized Warfare: Tank Factories & Tank Divisions

Take command of armored ground divisions to break enemy frontlines:

- **Tank Factory (`Tank Factory`)**: Automatically manufactures **Tank Divisions** when supported by nearby friendly resource mines within station range:
  - Requires at least **1 nearby Gold Mine** to operate. Additional Gold Mines reduce unit production cost (`50,000 × max(1, ceil(3 / goldMines))` Gold).
  - Nearby **Oil Mines** accelerate assembly speed (`max(10, 60 - oilMines × 10)` ticks per Tank).
- **Tank Divisions (`Tank`)**:
  - **Fuel Logistics**: Each Tank carries up to **100 Fuel**, consuming `1` fuel per tile moved and `1` fuel per cannon shot, and can refuel at `0.5` fuel/tick.
  - **Smart Pathfinding & Combat**: Navigates land terrain using 4-way Manhattan A\* pathfinding, engages hostile Tanks within range `2`, and triggers high-powered ground assaults (`max(250,000, 25% of player troops)`) upon entering enemy territory.

### ⛏️ Resource Extraction & Rail Supply/Demand Economy

Expand your industrial base with four specialized, upgradable extraction structures integrated directly into the railroad and maritime trade networks:

| Structure          | Base Cost      | Base Output (per interval × level) | Special Synergy                                                                                   |
| :----------------- | :------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Oil Mine**       | `150,000` Gold | `10,000` Gold                      | Grants **+30% Train Speed** per nearby Oil Mine to friendly Factories & boosts Tank Factory speed |
| **Gold Mine**      | `250,000` Gold | `15,000` Gold                      | Enables and reduces the cost of **Tank Division** production at nearby Tank Factories             |
| **Diamond Mine**   | `400,000` Gold | `25,000` Gold                      | High-yield late-game extraction facility                                                          |
| **Livestock Farm** | `100,000` Gold | `8,000` Gold                       | Cost-effective early-game economic producer                                                       |

- **Local Rail Supply & Demand Markets**:
  - Resource producers (`Oil Mine`, `Gold Mine`, `Diamond Mine`, `Livestock Farm`) must connect via rail clusters to consumer endpoints (**Cities**, **Factories**, **Ports**, and **Missile Silos**, each generating `25,000 × level` demand).
  - When cluster `supply <= demand`, producers earn **100%** of their normal output. If supply exceeds connected demand, market prices adjust proportionally down to a configurable `10%` floor. Disconnected mines without consumer demand produce `0` Gold.
- **Trade-Gated Production Reserves**:
  - Resource structures hold a bounded production reserve (`30s` capacity) that is refilled (`+15s` of output) whenever a friendly **Trade Ship** completes a maritime trade route.

### 🤖 Strategic AI Overhaul

AI Nations and Bots (`AiResourceStructureBehavior`) fully participate in all new mechanics:

- Strategically place and upgrade **Oil Mines**, **Gold Mines**, **Diamond Mines**, and **Livestock Farms** near rail networks and factories.
- Construct the **International Bank** when eligible, evaluate incoming loan requests, and request loans when low on gold.
- Build **Tank Factories** near Gold/Oil clusters and command/refuel **Tank Divisions** during active wars.

---

## 🎮 Core Gameplay & Structures

| Category                     | Units & Structures                                                                     | Role & Mechanics                                                                                                                                                                           |
| :--------------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Infrastructure & Economy** | **City**, **Factory**, **Port**, **International Bank**                                | Cities expand max troop capacity; Factories spawn trains across connected rail networks; Ports spawn Trade Ships and build Warships; International Bank controls global loans.             |
| **Resource Extraction**      | **Oil Mine**, **Gold Mine**, **Diamond Mine**, **Livestock Farm**                      | Generate level-scaled Gold income governed by rail-connected consumer demand and maritime trade refills.                                                                                   |
| **Ground & Naval Warfare**   | **Tank Factory**, **Tank Division**, **Defense Post**, **Warship**, **Transport Boat** | Defense Posts fortify borders (+5x defense, +3x slower enemy advance); Warships patrol seas, intercept boats/trade ships, and gain Veterancy (levels 0–3); Tanks spearhead land invasions. |
| **Nuclear & Air Defense**    | **Missile Silo**, **Atom Bomb**, **Hydrogen Bomb**, **MIRV**, **SAM Launcher**         | Launch tactical Atom Bombs, strategic Hydrogen Bombs, or continent-shattering MIRV warheads; defend airspace with upgradable SAM Launchers.                                                |

---

## 🏗️ Architecture & Tech Stack

OpenBI is structured as a deterministic TypeScript monorepo powered by npm workspaces:

```text
OpenFront-IR/
├── src/
│   ├── client/              # Frontend WebGL2 + Lit + TailwindCSS game client
│   └── server/              # Backend Express + WebSocket multiplayer game server & worker pool
├── packages/
│   ├── engine/              # Deterministic game simulation (@openfront/engine)
│   ├── engine-api/          # Engine contracts, types, Zod schemas & worker protocol (@openfront/engine-api)
│   ├── engine-lib/          # Shared simulation utilities, map grids, deterministic math (@openfront/engine-lib)
│   ├── shared/              # Client/server shared wire schemas & environment configs (@openfront/shared)
│   └── zbin/                # Compact binary wire serialization for Zod schemas (@openfront/zbin)
├── map-generator/           # Go-based map compiler & geographical asset pipeline
├── resources/               # Localization files (en.json, fa.json, etc.), icons, shaders, and maps
└── tests/                   # Vitest unit, integration, economy, matchmaking, and performance suites
```

---

## 📋 Prerequisites

- **[Node.js](https://nodejs.org/)**: `v24.15.0` or newer (within the Node `24.x` release line)
- **[npm](https://www.npmjs.com/)**: `v12.1.0` or newer (within the npm `12.x` release line)
- **Web Browser**: Any modern browser with WebGL2 support (Chrome, Edge, Firefox, Brave, Safari)

> [!TIP]
> Node.js may bundle an older npm version. Upgrade npm before installing dependencies:
>
> ```bash
> npm install --global --ignore-scripts npm@12.1.0
> ```

---

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Iliasoli/OpenFront-IR.git
   cd OpenFront-IR
   ```

2. **Install dependencies**

   ```bash
   npm run inst
   ```

   > [!IMPORTANT]
   > Always use `npm run inst` instead of `npm install` or `npm i`. It executes `npm ci --ignore-scripts` to deterministically install exact versions from `package-lock.json` without running arbitrary lifecycle scripts.

---

## 🎮 Running the Game

### Full Development Mode (Client + Server)

Run both the Vite frontend client and the backend game server concurrently with live reloading:

```bash
npm run dev
```

- Starts the Vite dev client with Hot Module Replacement (HMR)
- Launches the local Express/WebSocket game server in `dev` mode
- Automatically opens the game in your default browser (set `SKIP_BROWSER_OPEN=true` to disable)

### LAN / Host Mode

Expose your local development server on your local network:

```bash
npm run dev:host
```

### Client or Server Standalone

```bash
# Run only the frontend client
npm run start:client

# Run only the development game server
npm run start:server-dev

# Build production assets and start the production server
npm run tunnel
```

---

## 🛠️ Development, Testing & Benchmarking

| Command             | Description                                                       |
| :------------------ | :---------------------------------------------------------------- |
| `npm test`          | Run the full Vitest unit & server test suites                     |
| `npm run typecheck` | Run TypeScript compiler checks across all packages and workspaces |
| `npm run lint`      | Lint the codebase using **Oxlint** and **ESLint**                 |
| `npm run lint:fix`  | Automatically fix lint issues with Oxlint and ESLint              |
| `npm run format`    | Format all files using **Prettier**                               |
| `npm run perf`      | Run full-game and client performance benchmarks                   |
| `npm run gen-maps`  | Regenerate map data using the Go map generator (`map-generator/`) |

---

## 📄 License

- **Source Code**: Licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.
- **Game Assets**: Licensed under **[CC BY-SA 4.0](LICENSE-ASSETS)** (see [LICENSING.md](LICENSING.md) for full details).
- Modified versions must preserve copyright notices in reasonably visible locations (`© OpenFront and Contributors`).

---

---

<div dir="rtl" align="right">

# 🇮🇷 مستندات فارسی

## 📖 فهرست مطالب

- [معرفی پروژه](#-معرفی-پروژه)
- [ویژگی‌های جدید و اختصاصی OpenBI (OpenFront-IR)](#-ویژگیهای-جدید-و-اختصاصی)
  - [🏦 بانک بین‌المللی و سیستم وام‌دهی جهانی](#-بانک-بینالمللی-و-سیستم-وامدهی-جهانی)
  - [🪖 نبردهای زرهی: کارخانه تانک و لشکرهای تانک](#-نبردهای-زرهی-کارخانه-تانک-و-لشکرهای-تانک)
  - [⛏️ استخراج منابع و بازار عرضه و تقاضای ریلی](#️-استخراج-منابع-و-بازار-عرضه-و-تقاضای-ریلی)
  - [🤖 هوش مصنوعی استراتژیک پیشرفته](#-هوش-مصنوعی-استراتژیک-پیشرفته)
- [گیم‌پلی و سازه‌های اصلی بازی](#-گیمپلی-و-سازههای-اصلی-بازی)
- [معماری پروژه و تکنولوژی‌ها](#️-معماری-پروژه-و-تکنولوژیها)
- [پیش‌نیازها](#-پیشنیازها)
- [نصب و راه‌اندازی](#-نصب-و-راهاندازی)
- [اجرای بازی](#-اجرای-بازی)
- [ابزارهای توسعه و تست](#️-ابزارهای-توسعه-و-تست)
- [مجوز (لایسنس)](#-مجوز-لایسنس)

---

## 🌐 معرفی پروژه

**OpenBI (`OpenFront-IR`)** یک بازی استراتژی هم‌زمان (Real-Time Strategy) آنلاین و چندنفره با تمرکز بر کنترل قلمرو، دیپلماسی، تجارت ریلی و دریایی، و نبردهای مدرن است که بر پایهٔ [OpenFront.io](https://openfront.io/) توسعه یافته است. در این بازی، بازیکنان روی نقشه‌های واقعی جهان و مناطق جغرافیایی مختلف با یکدیگر رقابت می‌کنند، زیرساخت‌های اقتصادی و نظامی می‌سازند، ائتلاف تشکیل می‌دهند و با استفاده از نیروهای زمینی، دریایی و زرهی یا تسلیحات هسته‌ای برای تسلط بر نقشه می‌جنگند.

این نسخه علاوه بر پشتیبانی کامل از **زبان فارسی** و **انگلیسی**، مجموعه‌ای از مکانیزم‌های عمیق اقتصادی، بانکی، استخراج منابع و نبردهای تانک را به موتور بازی اضافه کرده است.

---

## 🚀 ویژگی‌های جدید و اختصاصی

### 🏦 بانک بین‌المللی و سیستم وام‌دهی جهانی

با تأسیس **بانک بین‌المللی (International Bank)** نبض اقتصاد بازی را در دست بگیرید:

- **شرایط ساخت**: پس از گذشت **۱۰ دقیقه (`600` ثانیه)** از شروع بازی فعال می‌شود. تنها **بزرگ‌ترین بازیکن نقشه** (از نظر مساحت قلمرو) که حداقل **۵۰۰ میلیون طلا** ذخیره داشته باشد می‌تواند این سازه را با هزینهٔ **۲۵۰ میلیون طلا** احداث کند.
- **یکتایی در نقشه و جابه‌جایی خودکار**: در هر بازی فقط **یک** بانک بین‌المللی می‌تواند وجود داشته باشد. اگر خانهٔ (Tile) محل قرارگیری بانک توسط دشمن تصرف شود اما مالک بانک هنوز زنده باشد و سرزمین‌های دیگری داشته باشد، بانک به دست دشمن نمی‌افتد بلکه **به‌طور خودکار به یکی دیگر از سرزمین‌های مالک منتقل می‌شود** و تنها در صورت حذف کامل مالک از بین می‌رود.
- **درخواست و اعطای وام**: تمام بازیکنان (انسان و هوش مصنوعی) می‌توانند از مالک بانک بین‌المللی درخواست وام کنند. مالک بانک می‌تواند درخواست‌ها را بررسی کرده و با تعیین **مبلغ وام** و **مدت بازپرداخت (بین ۵ تا ۳۶۰۰ ثانیه)** با آن‌ها موافقت یا مخالفت کند.
- **بازپرداخت خودکار در سررسید**: پس از پایان مهلت وام، کل مبلغ به‌صورت خودکار از حساب وام‌گیرنده کسر شده (حتی اگر موجودی او منفی شود!) و به حساب مالک بانک واریز می‌گردد.

---

### 🪖 نبردهای زرهی: کارخانه تانک و لشکرهای تانک

با احداث **کارخانه تانک (Tank Factory)** و اعزام **لشکرهای تانک (Tank Divisions)** خطوط دفاعی دشمن را در هم بشکنید:

- **کارخانه تانک (`Tank Factory`)**:
  - برای تولید تانک نیازمند وجود حداقل **۱ معدن طلا (Gold Mine)** خودی در شعاع ایستگاهی کارخانه است.
  - هرچه تعداد معادن طلای اطراف بیشتر باشد، هزینهٔ تولید هر تانک کاهش می‌یابد (`50,000 × max(1, ceil(3 / goldMines))` طلا).
  - وجود **معادن نفت (Oil Mine)** در نزدیکی کارخانه، سرعت تولید تانک را به‌شدت افزایش می‌دهد (`max(10, 60 - oilMines × 10)` تیک).
- **لشکر تانک (`Tank Division`)**:
  - **سیستم سوخت**: هر تانک دارای ظرفیت **۱۰۰ واحد سوخت** است؛ به ازای هر خانه حرکت `1` واحد و به ازای هر شلیک `1` واحد سوخت مصرف می‌کند و قابلیت سوخت‌گیری مجدد (`0.5` واحد در هر تیک) دارد.
  - **مسیریابی هوشمند و حملهٔ سنگین**: تانک‌ها با الگوریتم مسیریابی `A*` روی خشکی حرکت می‌کنند، با تانک‌های دشمن در برد `2` خانه درگیر می‌شوند و به محض ورود به خاک دشمن، یک حملهٔ زمینی قدرتمند (`حداکثر بین ۲۵۰,۰۰۰ نیرو یا ۲۵٪ کل ارتش مهاجم`) را علیه دشمن آغاز می‌کنند.

---

### ⛏️ استخراج منابع و بازار عرضه و تقاضای ریلی

چهار سازهٔ جدید استخراج منابع با قابلیت ارتقا (Upgrade) که مستقیماً با شبکهٔ ریلی و تجارت دریایی یکپارچه شده‌اند:

| نام سازه                      | هزینهٔ پایه   | درآمد پایه (به ازای هر سطح) | ویژگی و هم‌افزایی استراتژیک                                                                         |
| :---------------------------- | :------------ | :-------------------------- | :-------------------------------------------------------------------------------------------------- |
| **معدن نفت (Oil Mine)**       | `150,000` طلا | `10,000` طلا                | افزایش **+30% سرعت قطارهای** کارخانه‌های نزدیک به ازای هر معدن نفت + افزایش سرعت تولید کارخانه تانک |
| **معدن طلا (Gold Mine)**      | `250,000` طلا | `15,000` طلا                | فعال‌سازی و کاهش هزینهٔ تولید تانک در کارخانه‌های تانک مجاور                                        |
| **معدن الماس (Diamond Mine)** | `400,000` طلا | `25,000` طلا                | بالاترین نرخ تولید طلا برای تقویت اقتصاد در اواسط و اواخر بازی                                      |
| **دامداری (Livestock Farm)**  | `100,000` طلا | `8,000` طلا                 | سازهٔ اقتصادی ارزان‌قیمت و مناسب برای شروع و توسعهٔ اولیه                                           |

- **بازار محلی عرضه و تقاضای ریلی (Rail Supply & Demand Market)**:
  - سازه‌های تولیدکنندهٔ منابع (`معدن نفت`، `معدن طلا`، `معدن الماس` و `دامداری`) برای کسب درآمد باید از طریق شبکهٔ راه‌آهن به سازه‌های مصرف‌کننده (**شهرها**، **کارخانه‌ها**، **بنادر** و **سیلوهای موشکی** — هرکدام با تقاضای `25,000 × سطح`) متصل باشند.
  - زمانی که عرضه کمتر یا مساوی تقاضای شبکهٔ ریلی باشد، معادن **۱۰۰٪ درآمد کامل** را تولید می‌کنند. در صورت اشباع عرضه نسبت به تقاضا، قیمت بازار به‌صورت متناسب تنظیم می‌شود (تا کف `10%`). معادنی که به هیچ مصرف‌کننده‌ای متصل نباشند درآمدی تولید نمی‌کنند.
- **ذخیرهٔ تولید و شارژ با کشتی‌های تجاری**:
  - هر سازهٔ منابع دارای سقف ذخیرهٔ تولید ۳۰ ثانیه‌ای است و با هر بار تکمیل مسیر یک **کشتی تجاری (Trade Ship)** خودی، معادل **۱۵ ثانیه** ظرفیت تولید آن شارژ مجدد می‌شود.

---

### 🤖 هوش مصنوعی استراتژیک پیشرفته

ملت‌ها (Nations) و بات‌های بازی به هوش مصنوعی استراتژیک جدیدی مجهز شده‌اند که:

- معادن نفت، طلا، الماس و دامداری‌ها را در مجاورت خطوط راه‌آهن و کارخانه‌ها احداث و ارتقا می‌دهد.
- در صورت دارا بودن شرایط، **بانک بین‌المللی** را می‌سازد، به درخواست‌های وام پاسخ می‌دهد و در مواقع کمبود بودجه درخواست وام ثبت می‌کند.
- در کنار معادن طلا و نفت **کارخانه تانک** احداث کرده و لشکرهای تانک را در میدان نبرد هدایت و سوخت‌گیری می‌کند.

---

## 🎮 گیم‌پلی و سازه‌های اصلی بازی

| دسته‌بندی                    | سازه‌ها و واحدها                                                | کاربرد و مکانیزم                                                                                                                                       |
| :--------------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **زیرساخت و اقتصاد**         | **شهر، کارخانه، بندر، بانک بین‌المللی**                         | افزایش سقف جمعیت با شهرها؛ ایجاد شبکه ریلی و قطارهای طلا با کارخانه‌ها؛ تجارت دریایی و ساخت ناو با بنادر؛ مدیریت وام‌های کلان با بانک بین‌المللی.      |
| **استخراج منابع**            | **معدن نفت، معدن طلا، معدن الماس، دامداری**                     | تولید مستمر طلا بر اساس سطح سازه و تعادل عرضه و تقاضای شبکهٔ ریلی.                                                                                     |
| **نبرد زمینی و دریایی**      | **کارخانه تانک، لشکر تانک، پست دفاعی، ناو جنگی، قایق ترابری**   | تقویت خطوط مرزی با پست‌های دفاعی؛ تسلط بر دریاها و شکار کشتی‌های تجاری با ناوهای جنگی (دارای سیستم ارتقای درجه تا سطح ۳)؛ شکافتن خطوط دشمن با تانک‌ها. |
| **تسلیحات هسته‌ای و پدافند** | **سیلوی موشکی، بمب اتم، بمب هیدروژنی، MIRV، سامانه پدافند SAM** | پرتاب موشک‌های اتمی، هیدروژنی و کلاهک‌های چندگانه (MIRV) از سیلوها و رهگیری موشک‌های دشمن با لانچرهای دفاعی SAM.                                       |

---

## 🏗️ معماری پروژه و تکنولوژی‌ها

این پروژه به صورت یک Monorepo مبتنی بر TypeScript و npm workspaces طراحی شده است:

- **`/src/client`**: کلاینت تحت وب بازی (WebGL2، Lit، TailwindCSS 4 و Vite 8)
- **`/src/server`**: سرور چندنفرهٔ بازی (Express 5، WebSockets و مدیریت Workerها)
- **`/packages/engine`**: موتور شبیه‌ساز قطعی (Deterministic) بازی (`@openfront/engine`)
- **`/packages/engine-api`**: تایپ‌ها، اسکیماهای Zod و پروتکل ارتباطی موتور (`@openfront/engine-api`)
- **`/packages/engine-lib`**: کتابخانه‌های پایهٔ موتور، شبکهٔ نقشه و ریاضیات قطعی (`@openfront/engine-lib`)
- **`/packages/shared`**: کدهای مشترک بین کلاینت و سرور (`@openfront/shared`)
- **`/packages/zbin`**: فرمت باینری فشرده برای سریال‌سازی اسکیماهای Zod (`@openfront/zbin`)
- **`/map-generator`**: ابزار تولید و کامپایل نقشه‌ها به زبان Go
- **`/resources`**: فایل‌های ترجمه (`fa.json`، `en.json` و...)، آیکون‌ها، شیدرها و نقشه‌ها

---

## 📋 پیش‌نیازها

- **[Node.js](https://nodejs.org/)**: نسخهٔ `v24.15.0` یا بالاتر (در شاخهٔ Node 24)
- **[npm](https://www.npmjs.com/)**: نسخهٔ `v12.1.0` یا بالاتر (در شاخهٔ npm 12)
- **مرورگر وب مدرن**: کروم، فایرفاکس، اج یا هر مرورگر دارای پشتیبانی از WebGL2

برای ارتقای npm به نسخهٔ موردنیاز پیش از نصب وابستگی‌ها:

</div>

<div dir="ltr" align="left">

```bash
npm install --global --ignore-scripts npm@12.1.0
```

</div>

<div dir="rtl" align="right">

---

## 🚀 نصب و راه‌اندازی

۱. **کلون کردن مخزن (Repository):**

</div>

<div dir="ltr" align="left">

```bash
git clone https://github.com/Iliasoli/OpenFront-IR.git
cd OpenFront-IR
```

</div>

<div dir="rtl" align="right">

۲. **نصب پکیج‌ها و وابستگی‌ها:**

</div>

<div dir="ltr" align="left">

```bash
npm run inst
```

</div>

<div dir="rtl" align="right">

> **نکتهٔ مهم:** برای نصب پکیج‌ها حتماً از دستور `npm run inst` استفاده کنید و از اجرای `npm install` یا `npm i` خودداری نمایید تا نسخه‌های دقیق موجود در `package-lock.json` به‌صورت ایمن (`npm ci --ignore-scripts`) نصب شوند.

---

## 🎮 اجرای بازی

### اجرای کامل در حالت توسعه (کلاینت + سرور)

برای اجرای هم‌زمان کلاینت و سرور با قابلیت بارگذاری زنده (Live Reload):

</div>

<div dir="ltr" align="left">

```bash
npm run dev
```

</div>

<div dir="rtl" align="right">

### اجرای بازی روی شبکهٔ محلی (LAN)

</div>

<div dir="ltr" align="left">

```bash
npm run dev:host
```

</div>

<div dir="rtl" align="right">

### اجرای مجزای کلاینت یا سرور

</div>

<div dir="ltr" align="left">

```bash
# اجرای فقط کلاینت (Frontend)
npm run start:client

# اجرای فقط سرور در حالت توسعه (Backend)
npm run start:server-dev

# بیلد نسخه پروداکشن و اجرای سرور
npm run tunnel
```

</div>

<div dir="rtl" align="right">

---

## 🛠️ ابزارهای توسعه و تست

- **اجرای تست‌ها (Vitest):**

</div>

<div dir="ltr" align="left">

```bash
npm test
```

</div>

<div dir="rtl" align="right">

- **بررسی تایپ‌های TypeScript:**

</div>

<div dir="ltr" align="left">

```bash
npm run typecheck
```

</div>

<div dir="rtl" align="right">

- **بررسی و اصلاح خودکار کدها (Oxlint & ESLint):**

</div>

<div dir="ltr" align="left">

```bash
npm run lint
npm run lint:fix
```

</div>

<div dir="rtl" align="right">

- **فرمت کردن کدها (Prettier):**

</div>

<div dir="ltr" align="left">

```bash
npm run format
```

</div>

<div dir="rtl" align="right">

---

## 📄 مجوز (لایسنس)

کد منبع این پروژه تحت مجوز **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)** منتشر شده است و فایل‌های گرافیکی و دارایی‌های بازی تحت مجوز **[CC BY-SA 4.0](LICENSE-ASSETS)** قرار دارند.

</div>
