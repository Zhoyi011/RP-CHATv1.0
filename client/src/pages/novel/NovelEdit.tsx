// client/src/pages/novel/NovelEdit.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { novelApi, uploadApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { Novel } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const NovelEdit: React.FC = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 表单数据
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('武侠');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [cover, setCover] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [status, setStatus] = useState<'连载' | '完结'>('连载');
  
  // 分类选项
  const categories = ['武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'];

  // 加载小说信息
  useEffect(() => {
    const fetchNovel = async () => {
      if (!novelId) return;
      try {
        const res = await novelApi.getNovelDetail(novelId);
        const novel = res.novel;
        
        // 检查权限
        const authorId = typeof novel.authorPersonaId === 'string' 
          ? novel.authorPersonaId 
          : novel.authorPersonaId?._id;
        if (currentPersona?._id !== authorId) {
          toast.error('无权限编辑此小说');
          navigate('/author/dashboard');
          return;
        }
        
        setTitle(novel.title);
        setDescription(novel.description);
        setCategory(novel.category);
        setTags(novel.tags);
        setCover(novel.cover || '');
        setCoverPreview(novel.cover || '');
        setStatus(novel.status);
      } catch (error) {
        console.error('加载小说失败:', error);
        toast.error('加载失败');
        navigate('/author/dashboard');
      } finally {
        setFetching(false);
      }
    };
    
    fetchNovel();
  }, [novelId, currentPersona, navigate]);

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 上传封面
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    
    setUploading(true);
    try {
      // 使用小说封面上传API
      const res = await uploadApi.uploadNovelCover(currentPersona!._id, file);
      if (res.success) {
        setCover(res.cover);
        toast.success('封面上传成功');
      }
    } catch (error) {
      toast.error('封面上传失败');
      setCoverPreview(cover);
    } finally {
      setUploading(false);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入小说标题');
      return;
    }
    if (!description.trim()) {
      toast.error('请输入小说简介');
      return;
    }
    
    setLoading(true);
    try {
      await novelApi.updateNovel(novelId!, {
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        cover,
        status
      });
      
      toast.success('小说信息已更新');
      navigate('/author/dashboard');
    } catch (error: any) {
      toast.error(error.message || '更新失败');
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
            <h1>墨香阁 - 编辑小说</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/author/dashboard')}>
            <i className="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="create-form-container">
          <form onSubmit={handleSubmit} className="create-form">
            <h2><i className="fas fa-edit"></i> 编辑小说</h2>
            
            {/* 封面上传 */}
            <div className="form-group">
              <label>小说封面</label>
              <div className="cover-upload">
                <div className="cover-preview" onClick={() => document.getElementById('cover-input')?.click()}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="封面预览" />
                  ) : (
                    <div className="cover-placeholder-small">
                      <i className="fas fa-image"></i>
                      <span>点击上传封面</span>
                    </div>
                  )}
                </div>
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  style={{ display: 'none' }}
                />
                {uploading && <div className="uploading">上传中...</div>}
              </div>
            </div>
            
            {/* 小说标题 */}
            <div className="form-group">
              <label>小说标题 <span className="required">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入小说标题"
                maxLength={100}
                className="form-input"
              />
              <p className="form-hint">{title.length}/100</p>
            </div>
            
            {/* 小说简介 */}
            <div className="form-group">
              <label>小说简介 <span className="required">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入小说简介..."
                rows={5}
                maxLength={500}
                className="form-textarea"
              />
              <p className="form-hint">{description.length}/500</p>
            </div>
            
            {/* 分类 */}
            <div className="form-group">
              <label>分类 <span className="required">*</span></label>
              <div className="category-select">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-option ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 状态 */}
            <div className="form-group">
              <label>小说状态</label>
              <div className="status-select">
                <button
                  type="button"
                  className={`status-option ${status === '连载' ? 'active' : ''}`}
                  onClick={() => setStatus('连载')}
                >
                  <i className="fas fa-pen-fancy"></i> 连载中
                </button>
                <button
                  type="button"
                  className={`status-option ${status === '完结' ? 'active' : ''}`}
                  onClick={() => setStatus('完结')}
                >
                  <i className="fas fa-check-circle"></i> 已完结
                </button>
              </div>
            </div>
            
            {/* 标签 */}
            <div className="form-group">
              <label>标签（最多5个）</label>
              <div className="tags-input">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="输入标签后按 Enter"
                  className="tag-input"
                />
                <button type="button" onClick={addTag} className="btn-add-tag">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="tags-list">
                {tags.map(tag => (
                  <span key={tag} className="tag-item">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* 提交按钮 */}
            <div className="form-actions">
              <button type="button" className="btn-outline" onClick={() => navigate('/author/dashboard')}>
                取消
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NovelEdit;