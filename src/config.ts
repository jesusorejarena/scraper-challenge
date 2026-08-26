import * as path from 'path';

export const BASE_URL =
  'https://pjett.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam';
export const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

// Selectors
export const SELECTOR_TABLA_RESULTADOS = '[id="fPP:processosTable:tb"] tr';
export const SELECTOR_TABLA_DOCUMENTOS =
  '[id="j_id146:processoDocumentoGridTab:tb"] tr';
