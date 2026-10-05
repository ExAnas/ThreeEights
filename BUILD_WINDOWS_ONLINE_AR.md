# بناء ملف Windows Setup من المتصفح فقط

لا تحتاج Visual Studio ولا Rust ولا Node على جهازك.

## 1) ارفع المشروع إلى GitHub

1. أنشئ Repository جديداً في GitHub.
2. فك ضغط ملف المشروع.
3. من صفحة المستودع اختر **Add file → Upload files**.
4. ارفع محتويات المجلد بالكامل، بما فيها مجلد `.github` (إذا أخفاه Windows، يمكنك رفع المشروع كملفات من GitHub Desktop لاحقاً؛ أو استخدام Codespaces).
5. Commit changes.

## 2) شغّل البناء السحابي

1. افتح تبويب **Actions** في المستودع.
2. اختر **Build Windows installer**.
3. اضغط **Run workflow**.
4. انتظر اكتمال المهمة.
5. افتح آخر Run ثم انزل إلى **Artifacts**.
6. حمّل `three-eights-windows-installer`.
7. فك الضغط وستجد ملف Setup بصيغة `.exe`.

GitHub يشغّل البناء على `windows-latest`، لذلك الناتج Windows أصلي حتى لو جهازك الحالي لا يحتوي أي أدوات برمجة.

## ملاحظة SmartScreen

لأن النسخة التجريبية غير موقعة بشهادة Code Signing تجارية، قد يظهر Windows SmartScreen في أول تثبيت. هذا طبيعي لنسخة خاصة/تجريبية غير موقعة. للنشر العام لاحقاً نضيف شهادة توقيع أو ننشر عبر Microsoft Store.
