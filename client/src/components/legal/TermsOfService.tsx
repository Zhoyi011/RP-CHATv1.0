import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
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
          <h1 className="text-xl font-bold flex-1">服务条款</h1>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <p className="text-sm text-gray-500">最后更新日期：2026年3月18日</p>

          <section>
            <h2 className="text-lg font-semibold mb-3">1. 接受条款</h2>
            <p className="text-gray-600 leading-relaxed">
              欢迎使用 RP Chat（以下简称"本平台"）。通过访问或使用本平台，您同意受这些服务条款（"条款"）的约束。如果您不同意这些条款的任何部分，请不要使用本平台。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. 账户注册</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              使用本平台的部分功能需要注册账户。您同意：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>提供准确、完整的注册信息</li>
              <li>妥善保管您的账户凭证</li>
              <li>对账户下的所有活动负责</li>
              <li>及时更新过期的账户信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. 用户行为准则</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              您同意不会使用本平台进行以下活动：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>发布任何违法、骚扰、诽谤或歧视性内容</li>
              <li>侵犯他人知识产权</li>
              <li>传播病毒或恶意软件</li>
              <li>尝试未经授权访问系统</li>
              <li>滥用邀请码系统</li>
              <li>创建多个账户规避限制</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. 角色扮演内容</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              作为角色扮演平台，我们允许用户在角色框架内进行创作，但必须遵守以下原则：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>角色设定不得包含违法违规内容</li>
              <li>不得冒充他人或机构</li>
              <li>角色互动应保持基本的互相尊重</li>
              <li>管理员有权审核并拒绝不当角色申请</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. 虚拟货币</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              本平台提供虚拟货币（金币）系统：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>金币可通过每日登录、参与活动等方式获取</li>
              <li>金币可用于购买虚拟物品</li>
              <li>虚拟货币不可兑换现实货币</li>
              <li>我们保留调整金币获取规则的权利</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. 内容所有权</h2>
            <p className="text-gray-600 leading-relaxed">
              您保留您创建的角色和发布内容的所有权。但是，您授予我们非独家、免版税的许可，以在本平台上展示和分发这些内容。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. 终止服务</h2>
            <p className="text-gray-600 leading-relaxed">
              我们保留在任何时候、无需通知的情况下，因任何原因暂停或终止您的账户的权利，特别是当您违反这些条款时。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. 免责声明</h2>
            <p className="text-gray-600 leading-relaxed">
              本平台按"现状"提供，不提供任何明示或暗示的保证。我们不保证服务不会中断、及时、安全或无错误。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. 条款修改</h2>
            <p className="text-gray-600 leading-relaxed">
              我们可能不时修改这些条款。修改后的条款将在本页面发布，并注明最后更新日期。继续使用本平台即表示您接受修改后的条款。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. 联系我们</h2>
            <p className="text-gray-600 leading-relaxed">
              如果您对这些条款有任何疑问，请通过以下方式联系我们：
            </p>
            <p className="text-gray-600 mt-2">
              邮箱：support@rp-chat.com<br />
               Discord：RP Chat 官方服务器
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

export default TermsOfService;