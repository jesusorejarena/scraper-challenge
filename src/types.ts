export interface DocumentData {
  id: string;
  title: string;
  pdfUrl: string;
}

export interface BitacoraEntry {
  procesoTexto: string;
  detalleUrl: string;
  archivos: { nombre: string; webUrl: string; localPath: string }[];
}
