# التسليم — 8×3 Windows Beta

## النسخة
1.1.0 — Windows/Tauri beta

## المزايا المنفذة
- Desktop app عبر Tauri 2.
- React/TypeScript/Redux.
- مؤقت timestamp حقيقي مع وضع تجربة 30 ثانية.
- Native Windows notifications عبر Tauri notification plugin.
- Native Rust scheduler محفوظ في App Data؛ يعمل بينما النافذة مخفية في System Tray ويستعيد الموعد بعد إعادة فتح التطبيق.
- إغلاق X يخفي النافذة بدلاً من قتل التطبيق، مع Tray menu لفتح التطبيق أو الخروج.
- Supabase Email/Password login.
- Offline-first local persistence.
- Cloud autosync + RLS schema.
- Dark mode وRTL وإتاحة.
- GitHub Actions workflow لبناء NSIS .exe على Windows cloud runner.

## نقاط تحقق تمت هنا
- كل ملفات JSON صالحة.
- فحص syntax لـ 20 ملف TypeScript/TSX نجح بدون أخطاء parsing.
- لا يمكن إنتاج ملف Windows `.exe` داخل بيئة Linux الحالية بدون Windows toolchain؛ لذلك أضيف workflow سحابي يبنيه على `windows-latest`.
- لم تُشغّل اختبارات npm الكاملة هنا لأن تنزيل npm dependencies تعذر/انتهت مهلته في بيئة التنفيذ.

## قبل الإنتاج
- إنشاء Supabase project وتشغيل `supabase/setup.sql`.
- تحويل مدة التجربة من 30000 ms إلى 28800000 ms.
- Code signing لتجنب SmartScreen في التوزيع العام.
