# CLAUDE.md · 煮飯仔（cookrice）

俾之後喺 Claude Code 繼續開發嘅 AI 同人睇。玩法簡介喺 `README.md`，呢份講**點寫、點改、改完點驗**。

## 一句講晒
單一檔案網頁遊戲：`index.html`（HTML + CSS + JS 全部 inline，約 130KB，冇 build、冇框架、冇外部 JS 庫）。已經開咗 GitHub Pages：<https://fiveathree.github.io/cookrice/>，push 去 `main` 一兩分鐘後自動更新。進度存 `localStorage`，key 係 `cookrice.v1`。

概念參考同一個 GitHub 帳號下嘅 `fiveathree/dan`（九轉丹房，煉丹模擬器）：揀設定 → 按次序落料 → 出結果 → 處理結果。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 成個遊戲 |
| `favicon.svg` | 網頁圖示（深色底、紅碗白飯、筷子、蒸氣） |
| `apple-touch-icon.png` | 180×180，由 `favicon.svg` 轉出嚟 |
| `tools/check-recipes.js` | 用 node 計晒全部食譜預設分數，調平衡用 |
| `README.md` | 玩家睇嘅玩法說明（廣東話） |

## 寫嘢慣例
- **介面文字一律用香港廣東話書面語**（「撳」「落鑊」「睇下」「唔夠錢」）。用戶講廣東話，答佢都用廣東話。
- 用戶唔係寫程式出身。教佢自己做設定（GitHub Pages、Cloudflare 之類）就要由頭一步步講，掣同選單名要啱最新版本。
- Commit message：第一行廣東話摘要，下面英文 bullet 講改咗乜。
- Git 作者：`fiveathree <fiveathree@gmail.com>`，直接 push 去 `main`。
- 唔好加外部 JS 庫。字型只用 Google Fonts：LXGW WenKai TC（標題）、Noto Sans HK（內文）、IBM Plex Mono（數字），全部要有後備字型。
- 顏色全部用 CSS token（`:root`），淺色同深色模式都要掂。每個場景喺 `body[data-scene=…]` 改 `--acc`。
- 有動畫就要尊重 `prefers-reduced-motion`（而家有一條全域規則熄晒）。
- 唔用 `alert` / `confirm` / `prompt`。要確認就喺頁面入面做，例如「重新開始」要撳兩下。

## `index.html` 入面嘅 script 分區（按次序）
用 `/* ===== 名 ===== */` 分隔，搜呢啲字就搵到。

1. **資料**
   - `ING`：食材，由 `I(id, 名, cat, stage, ck, raw, price, flavor, opts)` 定義。
   - `METH`：煮法，9 種，key 係 `stir pan fry boil braise steam bake grill raw`。
   - `WARE`：廚具，15 款，每款有 `fit[method]` 0–1 同 `cap` 火力上限。
   - `HELP`：幫手，有 `bp` 神助攻價錢同 `bd` 神助攻效果。
   - `SC`：7 個場景。每個有火力上限、廚具、幫手、食材來源 `src`、食客評語 `cm`、說明 `note`。
   - `SKEYS`（場景次序）、`UNLOCK`（解鎖條件）、`WLV`（廚具等級）、`WCOST`。
   - `RECIPES`：35 個食譜。
   - `PAIRS` / `CLASH`：配搭加分／撞味。
   - `GRADES`：評級門檻；`SL` / `STH`：扒熟度；`ORDERS`：扒房客人熟度要求嘅抽籤池。
2. **狀態**：`newState()`、`restock()`（雪櫃、背囊等限量來源每日補貨）、`save()` / `load()`、`level()`、`sel()`（目前場景嘅設定）、`wareCap()`。
3. **計算**：`doneness()` 同 `evaluate(rand)`，係核心，詳見下面。另有 `nameDish()` 幫自創料理改名。
4. **場景背景**：`BG[scene]` 係一疊 CSS background layers（SVG data URI 加 gradient），由 `applyBG()` 貼去 `#scenebg`。
   - 位置寫 `top 96px` 呢類嘅掛飾，只喺電腦一版睇晒版面先畫（`narrowMQ`），唔係會壓住手機嘅場景掣。
5. **廚具畫面**
   - `HSRC` 指定每款廚具用乜火源：煤氣、電磁爐、炭、營火、自己發熱，或者冇火嘅枱。
   - `heatArt()` 畫火源，`wareArt()` 回傳 `{b:後層, a:食材擺放範圍, f:前層}`。
   - `foodsArt()` 畫食材印章；`fxArt()` 畫蒸氣同泡泡；`stageHTML(opts)` 砌埋成個畫面。
   - SVG viewBox 係 `0 22 320 178`。
6. **介面**：`render*()` 一組函數，冇 virtual DOM，直接重寫 `innerHTML`。
   - `renderPot(partial)`：`partial=true` 唔會重畫火候同時間 slider，咁拉緊 slider 都唔會斷。
   - `renderCtl()`：畫動畫上面嘅廚具、煮法、火候、時間控制。
7. **動作**
   - 落料、移除：`addItem` / `removeItem`。
   - 開煮流程：`cook()` → `showCooking()`（時間線同動畫）→ `showResult()` → `resolve(kind)`。
   - 其他：`work()`、`showShop()` / `buyUp()`、`showCodex()`、`reset()`、`init()`（事件全部喺度用 delegation 綁）。

最尾係 `if(!globalThis.NODE_TEST) init();`。所以 node 載入嗰陣唔會掂 DOM，用嚟測試計分。

## 核心計分 `evaluate(rand)`
`rand=false` 用嚟出預覽，唔會有隨機事件。開煮先用 `rand=true`。

1. **熟度**
   - 每樣食材喺時間 `ti = T × spread × i/(n-1)` 落鑊，即係越早落煮得越耐。
   - 受熱量 `ex = (T_eff − ti) × (heat/5)^1.25 × METH.mult`。
   - 熟度比率 `r = ex / ck`，再由 `doneness()` 按 `tol` 分級：生、半生、啱啱好、過火、燶。
   - 有湯水嘅煮、炆、蒸唔會燶：`tol ≥ 2` 嘅變「炆腍」，其餘變「過火」或者「煮爛」。
   - 扒（`steak:1`）用 `STH` 分成一成至全熟。扒房會同客人要求比較。
2. **次序**：按每樣食材嘅 stage 數有幾多「倒轉咗」嚟扣分（stage 0 係油，1 係香料，6 係收尾）。配對到食譜就 40% 睇呢個、60% 睇食譜 `seq` 嘅相對次序。
3. **調味**：鹹（甜品就睇甜）密度 = 總量 ÷ 主料份量。鹹嘅理想範圍係 0.35–1.5，鮮同香有加分，太甜、太酸、太辣、太油都扣分。
4. **配搭**：配對到食譜就睇有冇用到可選材料；自由發揮就睇有冇蛋白質、菜、香料，再計 `PAIRS` 同 `CLASH`。
5. **廚具**：`WARE.fit[method]`，再扣冇落油、冇落水，同埋火候同食譜差太遠。
6. **食材品質**：來源嘅 `q`。

權重：熟度 30、次序 15、調味 20、配搭 15、廚具 10、食材 10。次序嘅權重乘煮法嘅 `ow`，扣低咗嘅份數平均撥返去熟度同調味。

**加減分**：
- 加：爆香 +3、鑊氣 +5（炒鑊師傅 +8，神助攻 +12）、廚藝等級最多 +8、幫手、神助攻 +3、廚具升級 +2 或 +4。
- 場景規則：茶記快加慢扣、法國冇主廚 −5、營火 +3。

**評級門檻**：S ≥ 94、A ≥ 82、B ≥ 68、C ≥ 52、D ≥ 36，其餘係 E。

**隨機事件**（淨係 `rand=true` 先有）：

| 場景 | 事件 |
|---|---|
| 宿舍 | 跳掣、舍監沒收、公用雪櫃俾人發現 |
| 大排檔 | 火候 9 起火 |
| 屋企 | 炸嘢油彈 |
| 野外 | 落雨、營火忽大忽細、毒菇 |
| 幫手 | 細佬或者阿B 偷食 |

## 遊戲進度系統
- **時間**：每煮一餐，`早餐→午餐→晚餐→下一日`。打工會過一日。
- **錢**：用嚟買餸、升級廚具、俾神助攻（開煮嗰陣同餸錢一齊收）。
  - 出餐收錢 = max(食譜價, 成本 × 場景倍數) × 評級倍數 × 幫手倍數。
  - 屋企同野外唔收錢：屋企加名聲，野外加健康。
- **名聲**：出餐、影相打卡、事件都會加減。打工人工會隨名聲上升。
- **廚藝**：經驗 = 分數 ÷ 6（配對到食譜再 +3）。升到 Lv(L+1) 要 `30·L·(L+1)` 經驗。
- **場景解鎖**（`UNLOCK`，格式係 `[名聲, 廚藝等級]`）：茶記 [10,2]、大排檔 [25,3]、野外 [20,3]、扒房 [50,4]、法國 [80,5]。
- **廚具等級**：`S.wareLv[ware]`，1–3 級，叫 孖人牌 → Le Creuset → Mauviel 1830。同一款廚具喺唔同場景共用等級。Lv3 火力上限 +1，最高 9。
- **健康**：食生嘢或者毒菇會病。跌到 0 會入院三日，交醫藥費。

## 存檔 `S`（localStorage）
```
{ day, meal, money, fame, exp, health, scene,
  sel: { [scene]: { recipe, helper, boost, method, ware, heat, time } },
  pot: [ { id, src, srcn, price, q, lim?, poison? } ],
  stock: { "scene.src": { id: qty } },
  src: { [scene]: srcId }, codex: { [菜名]: { s, g, sc, r, n } },
  order, wareLv: { [ware]: 1..3 }, opened: [scene], ui: { [section]: open? } }
```
加新欄位要喺 `init()` 或者 `newState()` 補預設值，等舊存檔都讀得返。

## 版面
- **電腦**（闊 ≥ 1121px 而且高 ≥ 620px）：一版睇晒，三欄各自碌。
  - 左欄係灶台，有食譜同幫手（2×2，可以俾神助攻），兩樣都可以摺。
  - 中間係鑊，結構係：
    - 動畫上面四個角：左上廚具（加「升級」掣）、右上煮法、左下火候、右下時間。
    - 動畫下面：落鑊格（一行 5 個，可以拖動）、味道柱、預計分數、開煮掣。
  - 右欄係食材來源同食材。
- **手機**：上下排，次序係灶台、食材、鑊。
- 拖動排次序：
  - 滑鼠成格拖得。
  - 觸控要按住色字印先拖到，咁先唔會阻住碌頁。
  - 鍵盤喺色字印度撳箭咀鍵移。

## 改完點驗
1. 語法：抽出 script 用 `node --check`，或者直接跑下面第 2 步，有語法錯會即刻爆。
2. 平衡：`node tools/check-recipes.js`。
   - 預設設定通常應該 B–A，少數 S；唔好全部 S。
   - 有一行寫「冇配對到食譜」就代表食譜資料錯咗。
3. 介面：本機開伺服器 `python3 -m http.server`，喺瀏覽器行一次以下嘢，睇 console 有冇錯：
   - 切晒每個場景（未解鎖嘅可以喺 console 打 `S.fame=999;S.exp=9999;renderAll()`）。
   - 落料、拖次序、拉火候同時間。
   - 開煮、自己食、出餐。
   - 打開升級窗。
4. 手機闊度（390px）唔可以有橫向碌動。

## 加嘢指南
- **新食材**：喺「資料」區用 `I(...)` 加，再放入某個場景嘅 `src.items`（或者 `pool`、`fixed`、`chance`）。
  - `ck` 係「火候 5 煮幾分鐘先熟」，`tol` 係可以煮過頭幾多倍。
  - 唔想喺鑊畫面度顯示，就放落 `sau`、`oil` 或者 `liq` 類。
- **新食譜**：加入 `RECIPES`，然後跑 `tools/check-recipes.js` 調 `h`、`t` 同材料嘅 `ck`。
  - `m` 係煮法，`w` 係適用廚具，`req` 係必要材料，`opt` 係可選材料。
  - `seq` 係理想次序，`h` 係建議火候，`t` 係建議時間，`p` 係售價。
- **新廚具**：要改四個地方：`WARE`（fit / cap）、`HSRC`（火源）、`wareArt()`（畫法）、場景嘅 `wares`。
- **新場景**：
  - 加 `SC`、`SKEYS`、`UNLOCK`、`WCOST`、`SCOL`、`BG`。
  - 喺 CSS 加 `body[data-scene=…]{--acc:…}`。
  - 有特殊規則就喺 `evaluate()` 加。
- **新幫手**：喺 `HELP` 加，記得有 `bp` 同 `bd`。效果喺 `evaluate()`、`salePrice()` 或者 `resolve()` 用 `hp===…` 同 `BO` 判斷。

## 可以考慮嘅下一步（未做）
- 而家廚具等級用咗真品牌名（孖人牌、Le Creuset、Mauviel 1830）。如果之後要收費或者商業化，有機會惹商標問題，要換返自創名。
- 未有音效，未有成就系統。圖鑑淨係記錄最佳評級。
- 平衡數字（價錢、解鎖門檻、神助攻價）未經真人長時間試玩。
