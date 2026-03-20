import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">隐私政策</h1>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <p className="text-sm text-gray-500">最后更新日期：2026年3月18日</p>

          <section>
            <h2 className="text-lg font-semibold mb-3">1. 引言</h2>
            <p className="text-gray-600 leading-relaxed">
              RP Chat（以下简称"我们"）重视您的隐私。本隐私政策解释了我们如何收集、使用、披露和保护您的个人信息。使用本平台即表示您同意本隐私政策的条款。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. 我们收集的信息</h2>
            
            <h3 className="font-medium mt-3 mb-2">2.1 您直接提供的信息</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 mb-3">
              <li>注册信息（电子邮件地址）</li>
              <li>个人资料信息（用户名、头像）</li>
              <li>角色创建内容（角色名称、描述、标签）</li>
              <li>聊天记录和互动内容</li>
            </ul>

            <h3 className="font-medium mt-3 mb-2">2.2 自动收集的信息</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 mb-3">
              <li>日志数据（IP地址、浏览器类型、访问时间）</li>
              <li>设备信息（设备型号、操作系统）</li>
              <li>使用数据（页面访问、功能使用情况）</li>
            </ul>

            <h3 className="font-medium mt-3 mb-2">2.3 第三方服务信息</h3>
            <p className="text-gray-600 leading-relaxed mb-2">
              当您使用 Google、Apple 或 Game Center 登录时，我们会从这些服务获取您的：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>电子邮件地址</li>
              <li>公开资料信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. 我们如何使用信息</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>提供、维护和改进服务</li>
              <li>验证用户身份和防止欺诈</li>
              <li>处理您的请求和交易</li>
              <li>发送服务通知和更新</li>
              <li>个性化您的体验</li>
              <li>分析使用趋势</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. 信息分享</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              我们不会出售您的个人信息。但在以下情况可能分享：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>经您同意</li>
              <li>遵守法律要求</li>
              <li>保护权利和安全</li>
              <li>与服务提供商合作（如云存储）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. 数据安全</h2>
            <p className="text-gray-600 leading-relaxed">
              我们采取合理的技术和组织措施保护您的信息。但请注意，没有任何互联网传输是完全安全的。您也应妥善保管账户凭证。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. 数据保留</h2>
            <p className="text-gray-600 leading-relaxed">
              我们会在必要时间内保留您的信息，以提供服务、满足法律义务或解决争议。您可以请求删除您的账户和相关数据。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. 您的权利</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              根据适用法律，您可能拥有以下权利：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>访问您的个人信息</li>
              <li>更正不准确的信息</li>
              <li>删除您的信息</li>
              <li>限制或反对处理</li>
              <li>数据可携性</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. 儿童隐私</h2>
            <p className="text-gray-600 leading-relaxed">
              本平台不面向12岁以下儿童。如发现我们无意中收集了儿童信息，请立即联系我们删除。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. 政策变更</h2>
            <p className="text-gray-600 leading-relaxed">
              我们可能更新本隐私政策。重大变更将通过平台通告通知或电子邮件告知。继续使用服务即表示接受更新后的政策。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. 联系我们</h2>
            <p className="text-gray-600 leading-relaxed">
              如有隐私相关问题，请联系：
            </p>
            <p className="text-gray-600 mt-2">
              邮箱：zhoyi.lee@gmail.com<br />
              联络人名字：RP Chat 所有者，俊毅
            </p>
          </section>

          <div className="border-t pt-4 text-center text-sm text-gray-400">
            <p>© 2026 RP Chat. 保留所有权利。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;