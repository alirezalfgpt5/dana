import re

with open("src/components/issues/IssueFormTabs.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Stage 20
content = content.replace(
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage20Data?.paidAmount || 0}''',
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل صورتجلسه (۲۰٪)</label>
            <input
              type="file"
              onChange={e => setStage20Data({...stage20Data, minutesFile: e.target.files?.[0] || null})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">📂 فایل‌های سوابق (چندین فایل مجاز است)</label>
            <input
              type="file"
              multiple
              onChange={e => setStage20Data({...stage20Data, recordsFiles: Array.from(e.target.files || [])})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage20Data?.paidAmount || 0}'''
)

# Stage 50
content = content.replace(
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage50Data?.paidAmount || 0}''',
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل صورتجلسه (۵۰٪)</label>
            <input
              type="file"
              onChange={e => setStage50Data({...stage50Data, minutesFile: e.target.files?.[0] || null})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">📂 فایل‌های سوابق (چندین فایل مجاز است)</label>
            <input
              type="file"
              multiple
              onChange={e => setStage50Data({...stage50Data, recordsFiles: Array.from(e.target.files || [])})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage50Data?.paidAmount || 0}'''
)

# Stage 100
content = content.replace(
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage100Data?.paidAmount || 0}''',
    '''<div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل صورتجلسه (۱۰۰٪)</label>
            <input
              type="file"
              onChange={e => setStage100Data({...stage100Data, minutesFile: e.target.files?.[0] || null})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">📂 فایل‌های سوابق (چندین فایل مجاز است)</label>
            <input
              type="file"
              multiple
              onChange={e => setStage100Data({...stage100Data, recordsFiles: Array.from(e.target.files || [])})}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اعتبار پرداختی (ریال)</label>
            <input
              type="number"
              value={stage100Data?.paidAmount || 0}'''
)

# Application
content = content.replace(
    '''<div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">کارگروه مربوطه</label>
          <input
            type="text"
            value={applicationData?.workingGroup || ''}
            onChange={e => setApplicationData({...applicationData, workingGroup: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            placeholder="کارگروه..."
          />
        </div>
      </div>
      
      <div>''',
    '''<div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">کارگروه مربوطه</label>
          <input
            type="text"
            value={applicationData?.workingGroup || ''}
            onChange={e => setApplicationData({...applicationData, workingGroup: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            placeholder="کارگروه..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">📎 فایل صورتجلسه کاربست</label>
          <input
            type="file"
            onChange={e => setApplicationData({...applicationData, minutesFile: e.target.files?.[0] || null})}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">📂 فایل‌های نامه‌ها و سوابق (چندین فایل مجاز است)</label>
          <input
            type="file"
            multiple
            onChange={e => setApplicationData({...applicationData, recordsFiles: Array.from(e.target.files || [])})}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700"
          />
        </div>
      </div>
      
      <div>'''
)

with open("src/components/issues/IssueFormTabs.tsx", "w", encoding="utf-8") as f:
    f.write(content)
