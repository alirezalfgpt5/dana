import re

with open("src/components/issues/IssueFormTabs.tsx", "r", encoding="utf-8") as f:
    content = f.read()

func = """  const renderExecutiveContractTab = () => (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
        📝 قرارداد اعضای شورای اجرایی کلان پروژه - ثبت صورتجلسه
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          متن صورتجلسه
        </label>
        <textarea
          value={executiveContractData?.minutes || ''}
          onChange={e => setExecutiveContractData({...executiveContractData, minutes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-sm min-h-[100px]"
          placeholder="شرح صورتجلسه..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          آپلود فایل صورتجلسه
        </label>
        <input
          type="file"
          onChange={e => setExecutiveContractData({...executiveContractData, file: e.target.files?.[0] || null})}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
    </div>
  );
"""

content = content.replace(
    "const renderContractTab = () => (",
    func + "\n  const renderContractTab = () => ("
)

with open("src/components/issues/IssueFormTabs.tsx", "w", encoding="utf-8") as f:
    f.write(content)
