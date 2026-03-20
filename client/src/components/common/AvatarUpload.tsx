import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface Props {
  currentAvatar?: string;
  onUpload: (url: string) => void;
  onClose: () => void;
}

const AvatarUpload: React.FC<Props> = ({ currentAvatar, onUpload, onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 压缩图片
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 最大尺寸 200x200
          let width = img.width;
          let height = img.height;
          if (width > 200) {
            height = (height * 200) / width;
            width = 200;
          }
          if (height > 200) {
            width = (width * 200) / height;
            height = 200;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 压缩为 JPEG，质量 0.8
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 检查文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      // 压缩图片
      const compressedDataUrl = await compressImage(file);
      setPreviewUrl(compressedDataUrl);
      
      // 上传到 ImgBB
      const formData = new FormData();
      formData.append('image', compressedDataUrl.split(',')[1]);
      
      // 使用 ImgBB API（免费，需要注册获取 API Key）
      const response = await fetch('https://api.imgbb.com/1/upload?key=你的IMGbb_API_KEY', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        onUpload(data.data.url);
        toast.success('头像上传成功');
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleCrop = () => {
    if (previewUrl) {
      onUpload(previewUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">上传头像</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* 预览区域 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                <img
                  src={previewUrl || currentAvatar || 'https://ui-avatars.com/api/?background=10b981&color=fff&size=128'}
                  alt="预览"
                  className="w-full h-full object-cover"
                />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="text-white text-sm">上传中...</div>
                </div>
              )}
            </div>
          </div>

          {/* 按钮区域 */}
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              选择图片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {previewUrl && (
              <button
                onClick={handleCrop}
                disabled={uploading}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                确认使用
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            支持 JPG、PNG 格式，建议使用 1:1 比例图片
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvatarUpload;