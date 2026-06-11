// client/src/pages/novel/ChapterEdit.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { novelApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const ChapterEdit: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [novelTitle, setNovelTitle] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [chapterNumber, setChapterNumber] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  // 加载章节信息（编辑模式）
  useEffect(() => {
    const fetchChapter = async () => {
      if (!chapterId) {
        // 创建模式：获取小说信息
        try {
          const res = await novelApi.getNovelDetail(novelId!);
          setNovelTitle(res.novel.title);
          setFetching(false);
        } catch (error) {
          toast.error('加载失败');
          navigate('/author/dashboard');
        }
        return;
      }
      
      // 编辑模式
      setIsEditMode(true);
      try {
        const res = await novelApi.getChapterForEdit(chapterId);
        setTitle(res.chapter.title);
        setContent(res.chapter.content);
        setIsPublished(res.chapter.isPublished);
        setChapterNumber(res.chapter.chapterNumber);
        
        // 获取小说标题
        const novelRes = await novelApi.getNovelDetail(res.chapter.novelId);
        setNovelTitle(novelRes.novel.title);
      } catch (error) {
        console.error('加载章节失败:', error);
        toast.error('加载失败');
        navigate('/author/dashboard');
      } finally {
        setFetching(false);
      }
    };
    
    if (novelId) {
      fetchChapter();
    }
  }, [novelId, chapterId, navigate]);

  // 计算字数
  const calculateWordCount = (text: string) => {
    const cleaned = text.replace(/\s+/g, '');
    const chinese = cleaned.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || [];
    const english = cleaned.match(/[a-zA-Z0-9]/g) || [];
    return chinese.length + english.length;
  };

  const wordCount = calculateWordCount(content);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入章节标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入章节内容');
      return;
    }
    
    setLoading(true);
    try {
      if (isEditMode) {
        await novelApi.updateChapter(chapterId!, {
          title: title.trim(),
          content: content,
          isPublished
        });
        toast.success('章节已更新');
      } else {
        await novelApi.createChapter(novelId!, {
          title: title.trim(),
          content: content,
          isPublished
        });
        toast.success('章节创建成功');
      }
      navigate(`/novel/${novelId}/chapters`);
    } catch (error: any) {
      toast.error(error.message || (isEditMode ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="rp-novel-app">
        <div className="loading-placeholder">加载中...</div>
      </div>
    );
  }

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - {isEditMode ? '编辑章节' : '创建章节'}</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate(`/novel/${novelId}/chapters`)}>
            <i className="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="chapter-editor-container">
          <form onSubmit={handleSubmit} className="chapter-form">
            <div className="chapter-info-bar">
              <span className="novel-title">
                <i className="fas fa-book"></i> {novelTitle}
              </span>
              {isEditMode && (
                <span className="chapter-number">
                  <i className="fas fa-hashtag"></i> 第{chapterNumber}章
                </span>
              )}
              <span className="word-count">
                <i className="fas fa-file-word"></i> 字数: {wordCount}
              </span>
            </div>

            {/* 章节标题 */}
            <div className="form-group">
              <label>章节标题 <span className="required">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入章节标题"
                maxLength={200}
                className="form-input"
                autoFocus
              />
            </div>

            {/* 章节内容 - Markdown 编辑器 */}
            <div className="form-group">
              <label>章节内容 <span className="required">*</span></label>
              <div className="editor-container">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入章节内容...
                  
支持 Markdown 格式：
# 标题
**粗体**
*斜体*
- 列表项
> 引用

也可以直接粘贴纯文本，系统会自动保留段落格式。"
                  rows={20}
                  className="editor-textarea"
                />
                <div className="editor-preview">
                  <div className="preview-header">
                    <i className="fas fa-eye"></i> 预览
                  </div>
                  <div className="preview-content">
                    {content ? (
                      <div className="markdown-preview">
                        {content.split('\n').map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="preview-placeholder">
                        <i className="fas fa-edit"></i>
                        <p>输入内容后预览将显示在这里</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="form-hint">
                <i className="fas fa-info-circle"></i> 
                当前字数: {wordCount} 字
              </p>
            </div>

            {/* 发布状态 */}
            <div className="form-group">
              <label>发布状态</label>
              <div className="publish-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={isPublished}
                    onChange={() => setIsPublished(true)}
                  />
                  <span><i className="fas fa-globe"></i> 立即发布</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={!isPublished}
                    onChange={() => setIsPublished(false)}
                  />
                  <span><i className="fas fa-save"></i> 保存为草稿</span>
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => navigate(`/novel/${novelId}/chapters`)}
              >
                取消
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-save"></i>
                )}
                {loading ? '保存中...' : (isEditMode ? '保存修改' : '创建章节')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChapterEdit;