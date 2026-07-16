# Deploy ไทยลินดา

## 1. เตรียม Git repository

อัปโหลดโปรเจกต์นี้ขึ้น GitHub โดยเก็บ SvelteKit ไว้ที่ root และ Rails ไว้ใน `backend/` ห้าม commit `.env`, `backend/.env` และ `backend/config/master.key`.

## 2. สร้าง Rails และ PostgreSQL บน Render

1. เข้า Render Dashboard และเลือก `New > Blueprint`.
2. เลือก repository ของไทยลินดา.
3. Render จะอ่าน `render.yaml` และสร้าง `thailinda-api` กับ `thailinda-db` ใน Singapore พร้อมนำเข้าบทเรียน 86 รายการโดยอัตโนมัติ.
4. กรอก `RAILS_MASTER_KEY` จาก `backend/config/master.key`.
5. กรอก `TYPHOON_API_KEY` ด้วยคีย์ใหม่สำหรับ production.
6. ตั้ง `FRONTEND_ORIGINS` เป็น URL ของ Vercel เช่น `https://thailinda.vercel.app`.
7. Deploy และตรวจว่า `https://<rails-service>.onrender.com/up` ตอบสถานะ 200.

ระบบ production จะไม่สร้างบัญชีตัวอย่าง หากต้องการข้อมูลตัวอย่างชั่วคราวให้ตั้ง `SEED_DEMO_DATA=true` แล้ว deploy ใหม่ จากนั้นควรลบตัวแปรนี้ออก.

## 3. Deploy SvelteKit บน Vercel

1. เข้า Vercel และเลือก `Add New > Project`.
2. Import repository เดียวกันและเลือก Framework Preset เป็น SvelteKit.
3. เพิ่ม Environment Variable:

```env
PUBLIC_API_BASE_URL=https://<rails-service>.onrender.com/api/v1
```

4. Deploy แล้วนำ URL ที่ได้กลับไปใส่ `FRONTEND_ORIGINS` บน Render.
5. Redeploy Rails หลังเปลี่ยน environment variable.

## 4. ตรวจระบบหลัง Deploy

1. Login นักเรียนด้วยบัญชีและ PIN.
2. เปิดบทเรียน กดค้างเพื่อพูด แล้วตรวจผลจาก Typhoon.
3. Login ครู ตรวจห้องเรียน รายชื่อนักเรียน และสร้างงาน.
4. Login ผู้ปกครอง ตรวจพัฒนาการของบัญชีที่เชื่อมต่อ.
5. ตรวจว่า Browser DevTools ไม่มี `TYPHOON_API_KEY` และทุก API request ใช้ HTTPS.
