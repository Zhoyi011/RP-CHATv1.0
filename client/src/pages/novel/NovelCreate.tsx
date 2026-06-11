// client/src/pages/novel/NovelCreate.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, uploadApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const NovelCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentPersona, refresh: refreshPersona } = usePersona();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 表单数据
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('武侠');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [cover, setCover] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  
  // 分类选项
  const categories = ['武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'];

  // 检查是否是作者
  useEffect(() => {
    if (currentPersona && !currentPersona.isAuthor) {
      toast.error('您还不是作者，请先申请');
      navigate('/novel');
    }
  }, [currentPersona, navigate]);

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
    
    // 预览
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    
    setUploading(true);
    try {
      const res = await uploadApi.uploadPersonaAvatar(currentPersona!._id, file);
      if (res.success) {
        setCover(res.avatar);
        toast.success('封面上传成功');
      }
    } catch (error) {
      toast.error('封面上传失败');
      setCoverPreview('');
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
    if (!currentPersona) {
      toast.error('请先选择角色');
      return;
    }
    
    setLoading(true);
    try {
      const res = await novelApi.createNovel({
        personaId: currentPersona._id,
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        cover
      });
      
      toast.success('小说创建成功');
      navigate(`/author/dashboard`);
    } catch (error: any) {
      if (error.message?.includes('needExpand')) {
        toast.error('创作名额已满，请先扩展名额');
      } else {
        toast.error(error.message || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 创建小说</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/author/dashboard')}>
            <i className="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="create-form-container">
          <form onSubmit={handleSubmit} className="create-form">
            <h2><i className="fas fa-feather-alt"></i> 创建新小说</h2>
            
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
                <p className="form-hint">支持 jpg、png 格式，建议尺寸 300x400</p>
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
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                {loading ? '创建中...' : '创建小说'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NovelCreate;