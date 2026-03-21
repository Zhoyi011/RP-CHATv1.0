// 后端调用外部 API 的服务
const axios = require('axios');

// GitHub API 配置
const GITHUB_OWNER = 'Zhoyi011';
const GITHUB_REPO = 'RP-CHATv1.0';

/**
 * 获取 GitHub 提交记录
 */
async function getGitHubCommits(limit = 30, since?: string) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`, {
      params: {
        per_page: limit,
        ...(since && { since })
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RP-Chat-App'
      }
    });
    
    return response.data.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author.date,
      author: commit.commit.author.name,
      url: commit.html_url
    }));
  } catch (error) {
    console.error('获取 GitHub commits 失败:', error);
    throw error;
  }
}

/**
 * 获取单个 commit 详情
 */
async function getCommitDetail(sha: string) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${sha}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RP-Chat-App'
      }
    });
    
    return {
      sha: response.data.sha,
      message: response.data.commit.message,
      date: response.data.commit.author.date,
      author: response.data.commit.author.name,
      url: response.data.html_url,
      files: response.data.files?.map((f: any) => f.filename) || []
    };
  } catch (error) {
    console.error('获取 commit 详情失败:', error);
    throw error;
  }
}

module.exports = {
  getGitHubCommits,
  getCommitDetail
};