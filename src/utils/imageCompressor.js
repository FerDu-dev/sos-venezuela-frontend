/**
 * Comprime una imagen en el navegador del cliente antes de subirla al almacenamiento.
 * Redimensiona la imagen a un máximo de 800px (ancho o alto) y la convierte a WebP con calidad 0.7.
 * 
 * @param {File} file - El archivo de imagen original seleccionado por el usuario.
 * @returns {Promise<{blob: Blob, base64: string}>} - Promesa que resuelve con el Blob comprimido y su representación Base64.
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 800;

        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar exportar como WebP, si no es soportado, exportar como JPEG
        let mimeType = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback a jpeg
              mimeType = 'image/jpeg';
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    reject(new Error('No se pudo comprimir la imagen.'));
                    return;
                  }
                  const readerFallback = new FileReader();
                  readerFallback.readAsDataURL(fallbackBlob);
                  readerFallback.onloadend = () => {
                    resolve({
                      blob: fallbackBlob,
                      base64: readerFallback.result,
                    });
                  };
                },
                'image/jpeg',
                0.7
              );
              return;
            }

            const readerWebp = new FileReader();
            readerWebp.readAsDataURL(blob);
            readerWebp.onloadend = () => {
              resolve({
                blob,
                base64: readerWebp.result,
              });
            };
          },
          'image/webp',
          0.7
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
