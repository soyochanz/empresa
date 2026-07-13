export const optimizeImageFile = (
 file: File,
 options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> => {
 const { maxWidth = 1200, maxHeight = 800, quality = 0.72 } = options;

 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
 reader.onload = () => {
  const img = new Image();
  img.onerror = () => reject(new Error('No se pudo optimizar la imagen.'));
  img.onload = () => {
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
   resolve(String(reader.result || ''));
   return;
  }
  ctx.drawImage(img, 0, 0, width, height);
  resolve(canvas.toDataURL('image/webp', quality));
  };
  img.src = String(reader.result || '');
 };
 reader.readAsDataURL(file);
 });
};
