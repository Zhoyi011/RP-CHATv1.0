import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  currentAvatar?: string;
  onUpload: (url: string) => void;
  onClose: () => void;
  title?: string;
  type?: 'user' | 'persona';
  personaId?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const AvatarUpload: React.FC<Props> = ({ 
  currentAvatar, 
  onUpload, 
  onClose, 
  title = '更换头像',
  type = 'user',
  personaId 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/upload/${type}`;
      if (type === 'persona' && personaId) {
        url = `${API_BASE}/upload/persona/${personaId}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('头像上传成功');
        onUpload(data.avatar);
        onClose();
      } else {
        toast.error(data.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除头像吗？将恢复默认头像。')) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/upload/${type}`;
      if (type === 'persona' && personaId) {
        url = `${API_BASE}/upload/persona/${personaId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('已恢复默认头像');
        onUpload('');
        onClose();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-blue-100 text-sm">支持 JPG、PNG、GIF，最大 5MB</p>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-lg">
                <img
                  src={preview || currentAvatar || `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=128`}
                  alt="头像预览"
                  className="w-full h-full object-cover"
                />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
            >
              {uploading ? '上传中...' : '选择图片'}
            </button>
            
            {(currentAvatar || preview) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full border border-red-300 text-red-500 py-2.5 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
              >
                {deleting ? '删除中...' : '删除头像'}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              取消
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AvatarUpload;