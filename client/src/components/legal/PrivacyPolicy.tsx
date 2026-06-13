import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('intro');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    { id: 'intro', title: '引言', icon: '📖' },
    { id: 'collect', title: '信息收集', icon: '📊' },
    { id: 'use', title: '信息使用', icon: '⚙️' },
    { id: 'share', title: '信息分享', icon: '🤝' },
    { id: 'security', title: '数据安全', icon: '🔒' },
    { id: 'retention', title: '数据保留', icon: '⏱️' },
    { id: 'rights', title: '您的权利', icon: '⚖️' },
    { id: 'children', title: '儿童隐私', icon: '👶' },
    { id: 'changes', title: '政策变更', icon: '📝' },
    { id: 'contact', title: '联系我们', icon: '📧' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className={`sticky top-0 z-20 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 shadow-lg' : 'bg-gradient-to-r from-blue-600 to-cyan-600'} text-white backdrop-blur-sm`}>
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              隐私政策
            </h1>
            <p className="text-xs text-white/70 hidden sm:block">最后更新：2026年5月25日</p>
          </div>
          <div className="hidden md:flex gap-1 text-sm">
            {sections.slice(0, 5).map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/20 ${activeSection === section.id ? 'bg-white/30 font-medium' : ''}`}
              >
                {section.icon} {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          {/* 装饰条 */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="p-6 md:p-8 space-y-8">
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl mb-4">
                <span className="text-4xl">🔒</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                隐私政策
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                我们重视您的隐私，本政策详细说明我们如何保护您的个人信息
              </p>
              <p className="text-sm text-gray-400 mt-4">最后更新日期：2026年5月25日</p>
            </div>

            {/* 快速导航（移动端） */}
            <div className="md:hidden">
              <details className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
                  <span>📑</span> 快速导航
                </summary>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="text-left text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      {section.icon} {section.title}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {/* 1. 引言 */}
            <section id="intro" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg">📖</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. 引言</h2>
              </div>
              <div className="pl-4 border-l-4 border-blue-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  万物阁（以下简称"我们"、"本平台"）重视您的隐私。本隐私政策解释了我们如何收集、使用、披露和保护您的个人信息。使用本平台即表示您同意本隐私政策的条款。请仔细阅读。
                </p>
              </div>
            </section>

            {/* 2. 信息收集 */}
            <section id="collect" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">📊</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">2. 我们收集的信息</h2>
              </div>
              <div className="space-y-4 pl-4 border-l-4 border-purple-400">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    2.1 您直接提供的信息
                  </h3>
                  <ul className="list-none space-y-1 ml-6">
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 注册信息（电子邮件地址、用户名）</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 个人资料信息（头像、昵称）</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 角色创建内容（角色名称、描述、标签、头像）</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 聊天记录和互动内容</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    2.2 自动收集的信息
                  </h3>
                  <ul className="list-none space-y-1 ml-6">
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 日志数据（IP地址、浏览器类型、访问时间）</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 设备信息（设备型号、操作系统）</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 使用数据（页面访问、功能使用情况）</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    2.3 第三方服务信息
                  </h3>
                  <ul className="list-none space-y-1 ml-6">
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 电子邮件地址</li>
                    <li className="text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-purple-500">•</span> 公开资料信息（头像、显示名称）</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. 信息使用 */}
            <section id="use" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-lg">⚙️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">3. 我们如何使用信息</h2>
              </div>
              <div className="pl-4 border-l-4 border-green-400">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    '提供、维护和改进服务',
                    '验证用户身份和防止欺诈',
                    '处理您的请求和交易',
                    '发送服务通知和更新',
                    '个性化您的体验',
                    '分析使用趋势和优化性能',
                    '保护平台安全和完整',
                    '遵守法律义务'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. 信息分享 */}
            <section id="share" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-lg">🤝</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">4. 信息分享</h2>
              </div>
              <div className="pl-4 border-l-4 border-orange-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  我们不会出售您的个人信息。但在以下情况可能分享：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '经您明确同意',
                    '遵守法律要求',
                    '保护权利和安全',
                    '与服务提供商合作',
                    '业务转让或重组',
                    '防止欺诈活动'
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center text-sm text-gray-600 dark:text-gray-400">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 5. 数据安全 */}
            <section id="security" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white text-lg">🔒</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">5. 数据安全</h2>
              </div>
              <div className="pl-4 border-l-4 border-amber-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  我们采取合理的技术和组织措施保护您的信息，包括：
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">🔐 数据加密传输</span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">🛡️ 访问控制</span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">📊 定期安全审计</span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">⚠️ 入侵检测系统</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  但请注意，没有任何互联网传输是完全安全的。您也应妥善保管账户凭证。
                </p>
              </div>
            </section>

            {/* 6. 数据保留 */}
            <section id="retention" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-lg">⏱️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">6. 数据保留</h2>
              </div>
              <div className="pl-4 border-l-4 border-teal-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  我们会在必要时间内保留您的信息，以提供服务、满足法律义务或解决争议。您可以随时请求删除您的账户和相关数据，我们将在30天内处理。
                </p>
              </div>
            </section>

            {/* 7. 您的权利 */}
            <section id="rights" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-lg">⚖️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">7. 您的权利</h2>
              </div>
              <div className="pl-4 border-l-4 border-indigo-400">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '访问您的个人信息',
                    '更正不准确的信息',
                    '删除您的信息（被遗忘权）',
                    '限制或反对处理',
                    '数据可携性',
                    '撤回同意',
                    '拒绝自动化决策',
                    '向监管机构投诉'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 8. 儿童隐私 */}
            <section id="children" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-lg">👶</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">8. 儿童隐私</h2>
              </div>
              <div className="pl-4 border-l-4 border-pink-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  本平台不面向12岁以下儿童。我们不会故意收集儿童的个人信息。如发现我们无意中收集了儿童信息，请立即联系我们删除。
                </p>
              </div>
            </section>

            {/* 9. 政策变更 */}
            <section id="changes" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center text-white text-lg">📝</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">9. 政策变更</h2>
              </div>
              <div className="pl-4 border-l-4 border-gray-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  我们可能不时更新本隐私政策。重大变更将通过平台通告、弹窗通知或电子邮件告知。继续使用服务即表示接受更新后的政策。
                </p>
              </div>
            </section>

            {/* 10. 联系我们 */}
            <section id="contact" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg">📧</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">10. 联系我们</h2>
              </div>
              <div className="pl-4 border-l-4 border-blue-400">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    如有隐私相关问题，请通过以下方式联系我们：
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📧</span>
                      <span className="text-gray-700 dark:text-gray-300">zhoyi.lee@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👤</span>
                      <span className="text-gray-700 dark:text-gray-300">万物阁 所有者 · 俊毅</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💬</span>
                      <span className="text-gray-700 dark:text-gray-300">Discord: 万物阁 官方服务器</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 底部 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center text-sm text-gray-400">
              <p>© 2026 万物阁. 保留所有权利。</p>
              <p className="mt-2 text-xs">本隐私政策适用于 万物阁 所有服务</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;