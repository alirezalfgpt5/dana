import React from 'react';
import { Layers, Database, Shield, Layout, Settings, FileText, Share2, Zap, Monitor, Code, CheckCircle } from 'lucide-react';

export const ArchitectureDoc: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Vision */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Monitor className="text-blue-600" />
          ۱. چشم‌انداز کلی سیستم
        </h2>
        <p className="text-gray-600 leading-relaxed text-justify">
          <strong>DANA</strong> یک سیستم جامع مدیریت دانش است که به‌طور خاص برای سازمان‌های بزرگ، با تأکید بر ساختارهای نظامی، دانشی و پژوهشی طراحی شده است. 
          هدف اصلی این سیستم، <strong>ایجاد پل ارتباطی بین نیازهای دانشی سازمان و تولیدات دانشی موجود</strong> و در نهایت <strong>تبدیل شکاف‌های دانشی به پروژه‌های پژوهشی و عملیاتی</strong> است.
        </p>
      </section>

      {/* 2. Architecture Layers */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Layers className="text-indigo-600" />
          ۲. معماری کلی (لایه‌ها)
        </h2>
        <p className="text-gray-600 mb-4">سیستم بر اساس معماری لایه‌ای (Layered Architecture) پیاده‌سازی شده است:</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">لایه</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">شرح</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">UI (React + Tailwind + Vite)</td>
                <td className="px-6 py-4 text-sm text-gray-600">رابط کاربری واکنش‌گرا با پشتیبانی از حالت تاریک و نمایش درختواره‌های پویا با D3.js</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">State Management (Zustand)</td>
                <td className="px-6 py-4 text-sm text-gray-600">مدیریت حالت متمرکز (کاربر، تنظیمات، درختواره‌ها، دوره‌ها و ...)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">API Layer (Express.js)</td>
                <td className="px-6 py-4 text-sm text-gray-600">ارائه RESTful API برای تمام عملیات‌ها</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">Business Logic</td>
                <td className="px-6 py-4 text-sm text-gray-600">پیاده‌سازی تحلیل شکاف، مدیریت درختواره‌ها، نظام مسائل، خروجی‌ها و ...</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">Data Layer (SQLite + Drizzle)</td>
                <td className="px-6 py-4 text-sm text-gray-600">پایگاه داده با رویکرد ORM و پشتیبانی از تراکنش‌ها و ایندکس‌ها</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Entities */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Database className="text-emerald-600" />
          ۳. موجودیت‌های اصلی سیستم (Entities)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "درختواره دانشی (Knowledge Tree)", desc: "ساختار سلسله‌مراتبی از دانش‌ها با سطوح R → T → B → SB → L → Q" },
            { title: "گره (Node)", desc: "هر عنصر درختواره با سطح مشخص و قابلیت اتصال به قالب‌ها و نمونه‌ها" },
            { title: "قالب (Template)", desc: "تعریف نوع دانش (مثل سیاستی، راهبردی، پژوهشی)" },
            { title: "نمونه قالب (Instance)", desc: "نمونه واقعی از یک قالب (مثل یک سند یا گزارش خاص)" },
            { title: "دارایی دانشی (Asset)", desc: "مستندات، فایل‌ها و خروجی‌های متصل به گره‌ها" },
            { title: "شکاف دانشی (Gap)", desc: "اختلاف بین درختواره مورد نیاز و تولیدشده" },
            { title: "آیتم پژوهشی (Research Item)", desc: "موضوع پژوهشی که برای پر کردن یک گپ تعریف می‌شود" },
            { title: "مسئله (Issue)", desc: "پروژه عملیاتی با بودجه، زمان‌بندی، تیم اجرایی و مراحل پیشرفت" },
            { title: "کاربر و نقش‌ها", desc: "با نقش‌های superadmin, admin, user و سطوح سازمانی" },
            { title: "ساختار سازمانی", desc: "یگان‌های اصلی و جزء با سطوح سه‌گانه" }
          ].map((item, index) => (
            <div key={index} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col">
              <span className="font-bold text-gray-800 mb-1">{item.title}</span>
              <span className="text-sm text-gray-600">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Business Flows */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Share2 className="text-purple-600" />
          ۴. فرآیندهای کلیدی (Business Flows)
        </h2>
        <div className="space-y-6">
          <div className="border-r-4 border-blue-500 pr-4">
            <h3 className="font-bold text-lg text-gray-800 mb-2">۴.۱. مدیریت درختواره‌ها</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
              <li>کاربر می‌تواند درختواره مورد نیاز (Required) و درختواره تولیدشده (Produced) ایجاد کند.</li>
              <li>هر درختواره شامل گره‌هایی با سطوح مشخص است.</li>
              <li>گره‌های برگ (L) در درختواره مورد نیاز، به قالب‌ها متصل می‌شوند.</li>
              <li>گره‌های برگ در درختواره تولیدشده، به نمونه‌های قالب متصل می‌شوند.</li>
            </ul>
          </div>
          <div className="border-r-4 border-red-500 pr-4">
            <h3 className="font-bold text-lg text-gray-800 mb-2">۴.۲. تحلیل شکاف (Gap Analysis)</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
              <li>سیستم با مقایسه دو درختواره، گپ‌های دانشی را شناسایی می‌کند.</li>
              <li>وضعیت گپ‌ها: open (باز)، partially_filled (نیمه‌پر)، filled (پر شده).</li>
              <li>تحلیل بر اساس تطابق عنوان، قالب‌ها و نمونه‌ها انجام می‌شود.</li>
              <li>خروجی تحلیل به صورت جدول، گراف و گزارش اکسل قابل مشاهده است.</li>
            </ul>
          </div>
          <div className="border-r-4 border-amber-500 pr-4">
            <h3 className="font-bold text-lg text-gray-800 mb-2">۴.۳. تولید درختواره پژوهشی</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
              <li>از گپ‌های باز، به‌صورت خودکار درختواره پژوهشی تولید می‌شود.</li>
              <li>هر گپ باز به یک آیتم پژوهشی تبدیل می‌شود.</li>
              <li>آیتم‌های پژوهشی دارای ۹ ستون تحلیلی (اهمیت، اولویت، بازه زمانی، تأثیر رزمی و ...) هستند.</li>
            </ul>
          </div>
          <div className="border-r-4 border-emerald-500 pr-4">
            <h3 className="font-bold text-lg text-gray-800 mb-2">۴.۴. نظام مسائل (Issue System)</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
              <li>هر آیتم پژوهشی می‌تواند به یک مسئله تبدیل شود.</li>
              <li>هر مسئله شامل ۴۰+ فیلد است (اطلاعات پروژه‌ای، مالی، تیم حل مسئله، قرارداد، پیشرفت).</li>
            </ul>
          </div>
          <div className="border-r-4 border-purple-500 pr-4">
            <h3 className="font-bold text-lg text-gray-800 mb-2">۴.۵. خروجی‌ها (Outputs)</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
              <li>خروجی اکسل در ۶ شیت جداگانه یکپارچه (اطلاعات، درختواره، شکاف، پژوهش، مسائل، دارایی).</li>
              <li>خروجی گراف با استفاده از D3.js و SVG.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. UI Modules */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Layout className="text-cyan-600" />
          ۵. رابط‌های کاربری اصلی (UI Modules)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "داشبورد", desc: "نمایش آمار کلیدی، پیشرفت مسائل، گپ‌ها و فعالیت‌های اخیر" },
            { title: "درختواره مورد نیاز", desc: "ایجاد و مدیریت درختواره نیازمندی‌ها با نمایش گرافیکی" },
            { title: "درختواره تولیدشده", desc: "ایجاد و مدیریت درختواره دارایی‌های موجود" },
            { title: "تحلیل شکاف", desc: "اجرای تحلیل، نمایش نتایج به صورت جدول و گراف" },
            { title: "درختواره پژوهشی", desc: "مدیریت آیتم‌های پژوهشی و تبدیل به مسئله" },
            { title: "نظام مسائل", desc: "ثبت، ویرایش، حذف و پیگیری مسائل با فیلترهای پیشرفته" },
            { title: "گزارش‌ساز / خروجی‌ها", desc: "دریافت اکسل خام و پیش‌نمایش PDF/گراف" },
            { title: "نقش‌ها و کاربران", desc: "تعریف نقش‌های سفارشی با دسترسی‌های granular و مدیریت افراد" },
            { title: "تنظیمات و تعاریف", desc: "تنظیمات عمومی، پایه‌ها، قالب‌ها و ساختار سازمانی" }
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 transition-colors shadow-sm">
              <div className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                {item.title}
              </div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Security & 7. Automation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="text-red-500" />
            ۶. امنیت و دسترسی‌ها
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>احراز هویت با JWT و ذخیره امن نشست</li>
            <li>قفل خودکار صفحه پس از مدت زمان مشخص</li>
            <li>نقش‌های <code className="bg-gray-100 px-1 rounded text-red-600">superadmin</code>, <code className="bg-gray-100 px-1 rounded text-blue-600">admin</code>, <code className="bg-gray-100 px-1 rounded text-green-600">user</code></li>
            <li>امکان تعریف نقش‌های سفارشی با دسترسی‌های جزئی (Granular)</li>
            <li>ثبت تاریخچه کامل تغییرات (Audit Logs)</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" />
            ۷. یکپارچگی و اتوماسیون
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li><strong>تحلیل خودکار:</strong> کشف شکاف‌ها تنها با یک کلیک</li>
            <li><strong>تولید خودکار:</strong> استخراج درختواره پژوهشی از گپ‌ها</li>
            <li><strong>سینک هوشمند:</strong> انتقال اطلاعات از آیتم پژوهشی به مسئله</li>
            <li><strong>پشتیبان‌گیری:</strong> بکاپ‌گیری خودکار هر ۱۲ ساعت و امکان بکاپ دستی</li>
          </ul>
        </section>
      </div>

      {/* 8. Tech Stack */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Code className="text-gray-800" />
          ۸. فناوری‌های مورد استفاده (Tech Stack)
        </h2>
        <div className="flex flex-wrap gap-2">
          {["React 19", "TypeScript", "Vite", "Tailwind CSS", "Zustand", "Express.js 5", "Node.js", "Drizzle ORM", "SQLite (Better-SQLite3)", "D3.js", "Recharts", "ExcelJS", "jsPDF"].map((tech, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* 10. Unique Features */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="text-blue-200" />
          ویژگی‌های منحصربه‌فرد (Unique Features)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">سینک هوشمند قالب‌ها بین درختواره مورد نیاز، تولیدشده و نظام مسائل</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">تحلیل شکاف بر اساس نمونه‌های قالب (نه فقط عنوان)</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">۹ ستون تحلیلی پژوهشی برای اولویت‌بندی</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">۴۰+ فیلد پویا و کامل در شناسنامه نظام مسائل</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">خروجی اکسل کامل با ۶ شیت به‌صورت یکپارچه</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-300 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-50">پشتیبانی کامل از تاریخ شمسی و حالت‌های نمایش پیشرفته گراف</p>
          </div>
        </div>
      </section>

      {/* 11. Conclusion */}
      <section className="bg-gray-50 rounded-2xl p-6 shadow-inner border border-gray-200 text-center">
        <h3 className="font-bold text-gray-800 mb-2">نتیجه‌گیری</h3>
        <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
          سیستم <strong>DANA</strong> یک پلتفرم کامل برای <strong>مدیریت چرخه دانش سازمانی</strong> از <strong>شناسایی نیازها</strong> تا <strong>تولید دانش</strong> و <strong>تبدیل آن به پروژه‌های عملیاتی</strong> است. 
          این سیستم با بهره‌گیری از معماری مدرن، رابط کاربری حرفه‌ای و فرآیندهای خودکار، یک ابزار کارآمد برای سازمان‌های دانش‌محور محسوب می‌شود.
        </p>
      </section>

    </div>
  );
};
