# تطبيق إدارة الزبائن والرحلات - PWA

هذه النسخة متوافقة مع خادم Google Apps Script الذي يستخدم:
- SYNC_API_KEY
- action = sync
- sync_id
- updated_at
- deleted
- device_id

## الملفات
index.html
style.css
app.js
manifest.json
sw.js

## الرفع إلى GitHub Pages
1. أنشئ Repository جديداً.
2. اجعله Public.
3. ارفع الملفات الخمسة إلى الجذر.
4. Settings > Pages.
5. Source: Deploy from a branch.
6. Branch: main / root.
7. Save.
8. افتح رابط GitHub Pages من الهاتف.
9. من Chrome اختر إضافة إلى الشاشة الرئيسية / تثبيت التطبيق.

## مهم
لا تغيّر SYNC_URL أو SYNC_TOKEN داخل app.js إلا إذا غيّرت خادم المزامنة.
