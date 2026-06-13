import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('accept');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    { id: 'accept', title: '接受条款', icon: '📋' },
    { id: 'account', title: '账户注册', icon: '👤' },
    { id: 'conduct', title: '行为准则', icon: '⚡' },
    { id: 'rp', title: '角色扮演内容', icon: '🎭' },
    { id: 'currency', title: '虚拟货币', icon: '💰' },
    { id: 'ownership', title: '内容所有权', icon: '©️' },
    { id: 'termination', title: '终止服务', icon: '⏹️' },
    { id: 'disclaimer', title: '免责声明', icon: '⚠️' },
    { id: 'changes', title: '条款修改', icon: '📝' },
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
              服务条款
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
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="p-6 md:p-8 space-y-8">
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl mb-4">
                <span className="text-4xl">📜</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                服务条款
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                使用本平台即表示您同意以下条款
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

            {/* 1. 接受条款 */}
            <section id="accept" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg">📋</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. 接受条款</h2>
              </div>
              <div className="pl-4 border-l-4 border-blue-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  欢迎使用 万物阁（以下简称"本平台"）。通过访问或使用本平台，您同意受这些服务条款（"条款"）的约束。如果您不同意这些条款的任何部分，请不要使用本平台。
                </p>
              </div>
            </section>

            {/* 2. 账户注册 */}
            <section id="account" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">👤</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">2. 账户注册</h2>
              </div>
              <div className="pl-4 border-l-4 border-purple-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  使用本平台的部分功能需要注册账户。您同意：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    '提供准确、完整的注册信息',
                    '妥善保管您的账户凭证',
                    '对账户下的所有活动负责',
                    '及时更新过期的账户信息',
                    '不与他人共享账户',
                    '遵守所有适用的法律法规'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. 用户行为准则 */}
            <section id="conduct" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-lg">⚡</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">3. 用户行为准则</h2>
              </div>
              <div className="pl-4 border-l-4 border-red-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  您同意不会使用本平台进行以下活动：
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    '发布任何违法、骚扰、诽谤或歧视性内容',
                    '侵犯他人知识产权',
                    '传播病毒或恶意软件',
                    '尝试未经授权访问系统',
                    '滥用邀请码系统',
                    '创建多个账户规避限制',
                    '冒充他人或机构',
                    '进行任何形式的欺诈活动'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. 角色扮演内容 */}
            <section id="rp" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-lg">🎭</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">4. 角色扮演内容</h2>
              </div>
              <div className="pl-4 border-l-4 border-green-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  作为角色扮演平台，我们允许用户在角色框架内进行创作，但必须遵守以下原则：
                </p>
                <div className="space-y-2">
                  {[
                    '角色设定不得包含违法违规内容',
                    '不得冒充他人或机构',
                    '角色互动应保持基本的互相尊重',
                    '管理员有权审核并拒绝不当角色申请',
                    '角色描述不得包含攻击性言论',
                    '不得进行跨角色骚扰'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 5. 虚拟货币 */}
            <section id="currency" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white text-lg">💰</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">5. 虚拟货币</h2>
              </div>
              <div className="pl-4 border-l-4 border-yellow-400">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '金币可通过每日登录、参与活动等方式获取',
                    '金币可用于购买虚拟物品',
                    '虚拟货币不可兑换现实货币',
                    '我们保留调整金币获取规则的权利',
                    '邀请码可通过管理员获取',
                    '所有虚拟商品一经售出概不退换'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-lg p-2">
                      <span className="text-yellow-500">💎</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 6. 内容所有权 */}
            <section id="ownership" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-lg">©️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">6. 内容所有权</h2>
              </div>
              <div className="pl-4 border-l-4 border-indigo-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  您保留您创建的角色和发布内容的所有权。但是，您授予我们非独家、免版税的许可，以在本平台上展示和分发这些内容。您可以随时删除自己的内容，但已公开的内容可能仍被缓存。
                </p>
              </div>
            </section>

            {/* 7. 终止服务 */}
            <section id="termination" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center text-white text-lg">⏹️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">7. 终止服务</h2>
              </div>
              <div className="pl-4 border-l-4 border-gray-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  我们保留在任何时候、无需通知的情况下，因任何原因暂停或终止您的账户的权利，特别是当您违反这些条款时。您也可以随时自行删除您的账户。
                </p>
              </div>
            </section>

            {/* 8. 免责声明 */}
            <section id="disclaimer" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-lg">⚠️</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">8. 免责声明</h2>
              </div>
              <div className="pl-4 border-l-4 border-orange-400">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    本平台按"现状"提供，不提供任何明示或暗示的保证。我们不保证服务不会中断、及时、安全或无错误。在法律允许的最大范围内，我们不对任何间接损失承担责任。
                  </p>
                </div>
              </div>
            </section>

            {/* 9. 条款修改 */}
            <section id="changes" className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-lg">📝</div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">9. 条款修改</h2>
              </div>
              <div className="pl-4 border-l-4 border-teal-400">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  我们可能不时修改这些条款。修改后的条款将在本页面发布，并注明最后更新日期。重大变更将通过平台通知或电子邮件告知。继续使用本平台即表示您接受修改后的条款。
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
                    如果您对这些条款有任何疑问，请通过以下方式联系我们：
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📧</span>
                      <span className="text-gray-700 dark:text-gray-300">zhoyi.lee@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💬</span>
                      <span className="text-gray-700 dark:text-gray-300">Discord: 万物阁 官方服务器</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🌐</span>
                      <span className="text-gray-700 dark:text-gray-300">https://rp-chat-v1-0.vercel.app</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 底部 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center text-sm text-gray-400">
              <p>© 2026 万物阁. 保留所有权利。</p>
              <div className="flex justify-center gap-4 mt-2">
                <button onClick={() => navigate('/privacy')} className="text-xs hover:text-blue-500 transition">隐私政策</button>
                <span>•</span>
                <button onClick={() => navigate('/terms')} className="text-xs hover:text-blue-500 transition">服务条款</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;