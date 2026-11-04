/**
 * Модуль загрузки изображений в 100% оригинальном разрешении для Mitory Desktop.
 * Полностью отключён принудительный даунскейл через <canvas> и пережатие в lossy JPEG.
 * Сохраняет исходную чёткость, альфа-канал (PNG/WebP) и оригинальную битность иллюстраций.
 */

export function readFullResolutionImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Файл изображения не выбран'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event?.target?.result;
      if (typeof result === 'string' && result.length > 0) {
        resolve(result);
      } else {
        reject(new Error('Не удалось прочитать данные изображения'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('Ошибка чтения файла изображения'));
    };
    reader.readAsDataURL(file);
  });
}

// Обратная совместимость: возвращает 100% оригинальное изображение без потерь
export const compressImage = readFullResolutionImage;

export default readFullResolutionImage;
