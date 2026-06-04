// client/src/components/emoji/EmojiUploader.tsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Image, Loader2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { batchUploadEmojis } from '../../services/emojiApi';
import toast from 'react-hot-toast';

interface EmojiUploaderProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadingFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const EmojiUploader: React.FC<EmojiUploaderProps> = ({ onClose, onSuccess }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // 限制数量
    if (files.length + selectedFiles.length > 10) {
      toast.error('单次最多上传10张，请分批上传');
      return;
    }
    
    // 过滤文件类型和大小
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type);
      const maxSize = file.type === 'image/gif' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
      const isValidSize = file.size <= maxSize;
      
      if (!isValidType) toast.error(`${file.name}: 不支持的格式`);
      else if (!isValidSize) toast.error(`${file.name}: ${file.type === 'image/gif' ? 'GIF不能超过5MB' : '图片不能超过2MB'}`);
      
      return isValidType && isValidSize;
    });
    
    const newFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length]);

  const handleRemoveFile = (index: number) => {
    const file = files[index];
    if (file.preview) URL.revokeObjectURL(file.preview);
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('请选择要上传的表情');
      return;
    }
    
    if (files.length > 10) {
      toast.error('单次最多上传10张表情');
      return;
    }
    
    setUploading(true);
    
    // 标记为上传中
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));
    
    try {
      const fileObjects = files.map(f => f.file);
      const result = await batchUploadEmojis(fileObjects);
      
      // 标记成功
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' })));
      toast.success(`成功上传 ${result.emojis.length} 个表情`);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('上传失败:', error);
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error', 
        error: error.message || '上传失败' 
      })));
      toast.error(error.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 清理预览 URL
  React.useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">上传表情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 提示信息 */}
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-600 dark:text-blue-400">
          💡 支持 PNG、JPG、GIF、WebP 格式，单张最大2MB（GIF 5MB），每人最多300张
        </div>

        {/* 上传区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <label className="block w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 transition cursor-pointer bg-gray-50 dark:bg-gray-900/50">
            <div className="h-full flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击或拖拽上传图片</span>
              <span className="text-xs text-gray-400 mt-1">最多10张，支持批量上传</span>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>已选择 {files.length} 个文件</span>
                {!uploading && (
                  <button
                    onClick={() => {
                      files.forEach(f => URL.revokeObjectURL(f.preview));
                      setFiles([]);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    清空全部
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group"
                  >
                    <img
                      src={file.preview}
                      alt="预览"
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      {file.status === 'pending' && !uploading && (
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                      {file.status !== 'pending' && (
                        <div className="p-1.5 bg-black/50 rounded-full">
                          {getStatusIcon(file.status)}
                        </div>
                      )}
                    </div>
                    {file.status === 'error' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[10px] p-1 truncate">
                        {file.error}
                      </div>
                    )}
                    {file.file.type === 'image/gif' && (
                      <span className="absolute top-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">
                        GIF
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                上传 {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};