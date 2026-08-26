import * as fs from 'fs';
import * as path from 'path';
import { fetchWithRetry } from './utils';
import { DocumentData } from './types';

/**
 * Función auxiliar para descargar PDFs
 */
export async function downloadPdf(
  doc: DocumentData,
  targetDir: string,
  retries = 3,
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let extension = '.pdf';
    let fileName = `${doc.id}${extension}`;
    let filePath = path.join(targetDir, fileName);
    console.log(
      `Descargando documento para ${doc.id} (Intento ${attempt}/${retries})...`,
    );

    try {
      const response = await fetchWithRetry(doc.pdfUrl, {
        responseType: 'stream',
      });

      const contentType =
        response.headers && response.headers['content-type']
          ? response.headers['content-type'].toString().toLowerCase()
          : '';

      if (contentType.includes('text/html')) {
        extension = '.html';
        fileName = `${doc.id}${extension}`;
        filePath = path.join(targetDir, fileName);
      }

      console.log(`Guardando en ${filePath}...`);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      const exito = await new Promise<boolean>((resolve) => {
        writer.on('finish', () => resolve(true));
        writer.on('error', (error) => {
          console.error(`Fallo al guardar archivo para ${doc.id}:`, error);
          resolve(false);
        });
      });

      if (exito) return fileName;
    } catch (error) {
      console.error(
        `Fallo en el intento ${attempt} para ${doc.id} (HTTP Error).`,
      );
      if (attempt === retries) {
        console.error(`Fallo definitivo para ${doc.id}. Ignorando...`);
        fs.appendFileSync('failed_downloads.log', `${doc.id},${doc.pdfUrl}\n`);
        return null;
      }
      // Esperar 2 segundos antes de reintentar
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}
