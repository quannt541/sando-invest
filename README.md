# Sando Invest — AI Investment Agent

Ứng dụng đầu tư chứng khoán theo framework Value Investing của **Sando Triệu**.
Dữ liệu thực tế từ TCBS Public API. AI phân tích bởi Claude (Anthropic).

---

## Tính năng

| Trang | Mô tả |
|---|---|
| `/` Watchlist | 8 mã Sando-approved, signal thực tế, cảnh báo vùng mua |
| `/analyze` | Phân tích chi tiết 1 mã: biểu đồ, zone mua/bán, AI analysis |
| `/portfolio` | Danh mục cá nhân: theo dõi P&L, điểm bán tự động |
| `/chat` | Chat với AI Agent theo framework Sando |

---

## Deploy lên Vercel (20 phút, miễn phí)

### Bước 1 — Cài Node.js
Tải tại: https://nodejs.org (chọn LTS)

### Bước 2 — Tạo GitHub repo
1. Vào https://github.com → **New repository**
2. Tên: `sando-invest` → **Create repository**
3. Upload toàn bộ thư mục này lên (kéo thả vào trang repo)

### Bước 3 — Deploy Vercel
1. Vào https://vercel.com → **Sign up with GitHub**
2. Click **New Project** → Import repo `sando-invest`
3. Framework: Next.js (tự nhận diện)
4. **Environment Variables** → Thêm:
   - Key: `ANTHROPIC_API_KEY`
   - Value: API key của bạn (lấy tại https://console.anthropic.com)
5. Click **Deploy** → Chờ ~2 phút

### Bước 4 — Lấy link
Vercel tự tạo domain dạng: `sando-invest-xxx.vercel.app`
→ Share link này cho bất kỳ ai

---

## Chạy local (development)

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file môi trường
cp .env.local.example .env.local
# Mở .env.local và điền ANTHROPIC_API_KEY

# 3. Chạy
npm run dev

# 4. Mở browser: http://localhost:3000
```

---

## Cấu trúc project

```
sando-invest/
├── pages/
│   ├── index.js          # Watchlist
│   ├── analyze.js        # Phân tích cổ phiếu
│   ├── portfolio.js      # Danh mục cá nhân
│   ├── chat.js           # AI Agent chat
│   └── api/
│       ├── stock.js      # Fetch dữ liệu TCBS
│       ├── analyze.js    # AI phân tích 1 mã
│       ├── chat.js       # AI chat
│       └── watchlist.js  # Batch fetch 8 mã
├── components/
│   ├── Nav.js            # Navigation
│   ├── SignalBadge.js    # Badge BUY/WAIT/HOLD
│   └── MiniChart.js      # Biểu đồ giá mini
├── lib/
│   ├── tcbs.js           # TCBS API + Sando signals
│   └── sando-prompt.js   # System prompt AI
└── styles/
    └── globals.css       # Styles
```

---

## Thuật toán Sando Signals (lib/tcbs.js)

```
1. Đỉnh 3 năm = max(high) trong 756 phiên giao dịch
2. % giảm từ đỉnh = (đỉnh - giá hiện tại) / đỉnh * 100
3. Zone 1: giảm 20% → mua 30% vốn
   Zone 2: giảm 30% → mua 40% vốn
   Zone 3: giảm 40% → mua 30% vốn
4. Volume ratio = TB 5 phiên / TB 20 phiên
5. Momentum: ratio >= 1.5 + trên MA20 = STRONG
6. Signal = BUY nếu trong zone + momentum không yếu
```

---

## Lưu ý quan trọng

> Đây là công cụ học tập và hỗ trợ ra quyết định theo framework Sando Triệu.
> **KHÔNG phải lời khuyên tài chính chính thức.**
> Dữ liệu từ TCBS có thể trễ 15-30 phút trong giờ giao dịch.
