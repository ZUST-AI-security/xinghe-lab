import React, { useRef } from 'react';

const ImageUploader = ({ onUpload, preview }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(file, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group"
      onClick={() => fileInputRef.current?.click()}
    >
      {preview ? (
        <div className="relative group/preview w-full aspect-square max-h-48 rounded-xl overflow-hidden shadow-2xl">
          <img src={preview} className="w-full h-full object-cover transition-transform group-hover/preview:scale-110" alt="Preview" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-bold">更换图片</span>
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-3xl">🖼️</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-300">点击或拖拽上传</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Supports PNG, JPG up to 5MB</p>
          </div>
        </>
      )}
      
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;
