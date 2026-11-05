# wlb-web

Frontend ของ **Balance Our Day** — https://balance-our-day.pages.dev

ดูว่าตอนนี้เป็นเวลาทำอะไร ตารางวันนี้ ตารางรายสัปดาห์ สัดส่วนเวลาแต่ละหมวด ดูตารางเพื่อนในกลุ่ม และ (เฟส 3) เรียนคอร์สตามลำดับ

- React 19 + esbuild (ไม่มี framework อื่น) · CSS tokens ธีมมืด/สว่าง
- ไทย / English · รองรับมือถือ แท็บเล็ต PC · ติดตั้งเป็นแอปได้ (PWA manifest)
- Backend: [wlb-api](https://github.com/NattsuSummer/wlb-api)

## หน้า (เฟส 2)

| Path | หน้า |
|---|---|
| `/` | วันนี้: ตอนนี้ทำอะไร เหลือกี่นาที ถัดไป · ไทม์ไลน์วันนี้ · คนอื่นทำอะไร · สัดส่วนเทียบเป้า |
| `/schedule` | ตารางของฉัน: เลือกหลายวัน + ช่วงเวลา, หลายหมวดต่อช่อง, เตือน/ยืนยันก่อนทับ (พรีวิวก่อน→หลัง), ล้างพร้อมยืนยัน, เลิกทำ, ตั้งเป้า |
| `/schedule/:username` | ตารางของคนอื่น (ดูอย่างเดียว, ตาม privacy · admin แก้ได้) |
| `/members` | การ์ดสมาชิก |
| `/settings` | โปรไฟล์, รหัสผ่าน, ความเป็นส่วนตัว (+พรีวิว), ธีม/ภาษา, API tokens |
| `/admin` | ผู้ใช้, หมวดเวลา, API tokens ทั้งหมด |

## พัฒนา

```bash
npm install
npm run build                       # → dist/  (API_URL=... เพื่อเปลี่ยน backend, "" = same origin)
npm run dev                         # esbuild watch
```

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) → Cloudflare Pages project `balance-our-day`
- push เข้า `main` → production
- ทุก pull request → preview URL (ดูใน job summary) ไว้ลองก่อน merge

ต้องมี repo secrets `CLOUDFLARE_API_TOKEN` (สิทธิ์ Cloudflare Pages: Edit) และ `CLOUDFLARE_ACCOUNT_ID`
