import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fetchWithRetry } from './utils';

// ==========================================
// CONFIGURACIÓN (TÚ DEBES LLENAR ESTOS DATOS)
// ==========================================
const BASE_URL = "https://pjett.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam";
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Nombres de los campos del formulario JSF (Búscalos inspeccionando la página)
const FORM_NAME = "fPP"; // ej: 'fPP'
const INPUT_NOME_PARTE = "fPP:dnp:nomeParte"; // ej: 'fPP:dnp:nomeParte'
const BTN_PESQUISAR = "fPP:searchProcessos"; // ej: 'fPP:searchProcessos'

// Selectores CSS de las tablas (Búscalos inspeccionando la página)
const SELECTOR_TABLA_RESULTADOS = '[id="fPP:processosTable:tb"] tr';
const SELECTOR_TABLA_DOCUMENTOS = '[id="j_id146:processoDocumentoGridTab:tb"] tr';
// ==========================================

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

interface DocumentData {
    id: string;
    title: string;
    pdfUrl: string;
}

// Función auxiliar para descargar PDFs
async function downloadPdf(doc: DocumentData, targetDir: string, retries = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        let extension = ".pdf";
        let fileName = `${doc.id}${extension}`;
        let filePath = path.join(targetDir, fileName);
        console.log(`Descargando documento para ${doc.id} (Intento ${attempt}/${retries})...`);
        
        try {
            const response = await fetchWithRetry(doc.pdfUrl, { responseType: 'stream' });
            
            const contentType = response.headers && response.headers['content-type'] ? response.headers['content-type'].toString().toLowerCase() : '';
            if (contentType.includes('text/html')) {
                extension = ".html";
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
            console.error(`Fallo en el intento ${attempt} para ${doc.id} (HTTP Error).`);
            if (attempt === retries) {
                console.error(`Fallo definitivo para ${doc.id}. Ignorando...`);
                fs.appendFileSync('failed_downloads.log', `${doc.id},${doc.pdfUrl}\n`);
                return null;
            }
            // Esperar 2 segundos antes de reintentar
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

interface BitacoraEntry {
    procesoTexto: string;
    detalleUrl: string;
    archivos: string[];
}

async function main() {
    let allData: DocumentData[] = [];
    let bitacora: BitacoraEntry[] = [];
    console.log("1. Obteniendo página inicial para capturar sesión...");
    const responseInicial = await fetchWithRetry(BASE_URL);
    let $ = cheerio.load(responseInicial.data);
    const viewState = $('input[name="javax.faces.ViewState"]').val();
    
    // --- MANEJO DE COOKIES (VITAL PARA JSF) ---
    const setCookie = responseInicial.headers['set-cookie'];
    const cookieHeader = setCookie ? setCookie.map((c: string) => c.split(';')[0]).join('; ') : '';
    // ------------------------------------------
    
    if (!viewState) {
        console.error("No se pudo obtener el ViewState. Revisa la URL o si el sitio requiere headers adicionales.");
        return;
    }

    console.log("2. Ejecutando búsqueda simulando formulario...");
    
    // Payload extraído del navegador (incluye campos ocultos, radio buttons y AJAX)
    const rawPayload = 'AJAXREQUEST=_viewRoot&fPP%3AnumProcesso-inputNumeroProcessoDecoration%3AnumProcesso-inputNumeroProcesso=&mascaraProcessoReferenciaRadio=on&fPP%3Aj_id162%3AprocessoReferenciaInput=&fPP%3Adnp%3AnomeParte=JOSE%20SILVA&fPP%3Aj_id180%3AnomeAdv=&fPP%3Aj_id189%3AclasseJudicial=&fPP%3Aj_id189%3AsgbClasseJudicial_selection=&tipoMascaraDocumento=on&fPP%3AdpDec%3AdocumentoParte=&fPP%3ADecoration%3AnumeroOAB=&fPP%3ADecoration%3Aj_id223=&fPP%3ADecoration%3AestadoComboOAB=org.jboss.seam.ui.NoSelectionConverter.noSelectionValue&fPP%3AdataAutuacaoDecoration%3AdataAutuacaoInicioInputDate=01%2F01%2F2023&fPP%3AdataAutuacaoDecoration%3AdataAutuacaoInicioInputCurrentDate=08%2F2026&fPP%3AdataAutuacaoDecoration%3AdataAutuacaoFimInputDate=31%2F12%2F2023&fPP%3AdataAutuacaoDecoration%3AdataAutuacaoFimInputCurrentDate=08%2F2026&fPP=fPP&autoScroll=&javax.faces.ViewState=j_id5&fPP%3Aj_id244=fPP%3Aj_id244&AJAX%3AEVENTS_COUNT=1&';
    
    const parametros = new URLSearchParams(rawPayload);
    // Eliminar los flags de AJAX para que el servidor responda con HTML normal y no XML/Redirección
    parametros.delete('AJAXREQUEST');
    parametros.delete('AJAX:EVENTS_COUNT');
    
    // Es CRÍTICO reemplazar el ViewState estático por el que acabamos de capturar
    parametros.set('javax.faces.ViewState', viewState as string);

    const responseBusqueda = await fetchWithRetry(BASE_URL, {
        method: 'POST',
        data: parametros,
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader // ¡Enviamos la sesión aquí!
        }
    });

    console.log("3. Analizando tabla de resultados...");
    $ = cheerio.load(responseBusqueda.data);
    
    // --- NUEVO CÓDIGO PARA DEPURAR ---
    // Guardamos el HTML resultante para que puedas abrirlo y ver qué pasó
    fs.writeFileSync('debug_busqueda.html', responseBusqueda.data);
    
    // Buscamos si hay algún mensaje de error rojo en la página (la franja de arriba)
    const mensajeError = $('.rich-messages').text().trim() || $('.alert').text().trim();
    if (mensajeError) {
        console.log("⚠️ EL SERVIDOR DEVOLVIÓ UN MENSAJE:", mensajeError);
    }
    // ---------------------------------

    const filas = $(SELECTOR_TABLA_RESULTADOS);
    console.log(`Se encontraron ${filas.length} resultados en la tabla principal.`);

    // Transformamos las filas a un array para poder usar for...of con await
    let filasArray = filas.toArray();
    const isTestMode = process.env.LIMIT_TESTING === 'true';

    if (isTestMode) {
        console.log("🛠️ MODO PRUEBA ACTIVO: Se escanearán las filas necesarias hasta encontrar y descargar un máximo de 5 PDFs.");
    }

    let totalDescargas = 0;

    for (let i = 0; i < filasArray.length; i++) {
      if (isTestMode && totalDescargas >= 5) {
          console.log("¡Se alcanzó el límite total de 5 PDFs descargados para tu prueba! Terminando...");
          break;
      }

      const fila = filasArray[i];

      // 4. Buscar CUALQUIER enlace que tenga "openPopUp" en su onclick
      const botonDetalles = $(fila).find('a[onclick*="openPopUp"]');
      const onclickAtributo = botonDetalles.attr("onclick");
      let urlDetalle = "";

      if (onclickAtributo) {
        // Expresión regular mejorada: ignora espacios y captura la URL
        const match = onclickAtributo.match(
          /openPopUp\([^,]+,\s*['"]([^'"]+)['"]/,
        );
        if (match && match[1]) {
          urlDetalle = match[1].startsWith("http")
            ? match[1]
            : "https://pjett.trf5.jus.br" + match[1];
        } else {
          console.log(
            "Fila " +
              i +
              ": Se encontró onclick pero falló la Regex: " +
              onclickAtributo,
          );
        }
      } else {
        // Si una fila no tiene botón (puede ser una fila vacía o de diseño de la tabla)
        console.log(
          "Fila " + i + ": Esta fila no tiene botón de detalles, saltando...",
        );
      }

      if (urlDetalle) {
        console.log("4. Analizando detalles en: " + urlDetalle);
        const responseDetalle = await fetchWithRetry(urlDetalle);
        const $detalle = cheerio.load(responseDetalle.data);

        console.log(`5. Buscando PDFs en los detalles (Fila ${i})...`);
        const docFilas = $detalle(SELECTOR_TABLA_DOCUMENTOS).toArray();
        
        // Extraemos un nombre válido para la carpeta del usuario/proceso (de la etiqueta b.btn-block)
        const procesoNum = $(fila).find("b.btn-block").text().trim() || `Proceso_${i}`;
        const folderName = procesoNum.replace(/[^a-zA-Z0-9-_\s]/gi, '_').substring(0, 80).trim();
        const userDownloadDir = path.join(DOWNLOAD_DIR, folderName);
        
        if (!fs.existsSync(userDownloadDir)) {
            fs.mkdirSync(userDownloadDir, { recursive: true });
        }

        const bitacoraEntry: BitacoraEntry = {
            procesoTexto: procesoNum,
            detalleUrl: urlDetalle,
            archivos: []
        };

        for (let j = 0; j < docFilas.length; j++) {
            if (isTestMode && totalDescargas >= 5) {
                break; // Romper el loop interno si ya llegamos a 5
            }

            const docFila = docFilas[j];

            // Iteramos sobre todos los botones <a> de la fila para encontrar enlaces de descarga/visualización
            const aTags = $detalle(docFila).find("a").toArray();
            const potentialLinks: string[] = [];
            for (const el of aTags) {
                const aTag = $detalle(el);
                const onclickStr = aTag.attr("onclick") || "";
                const match = onclickStr.match(/openPopUp\('[^']+',\s*'([^']+)'/);
                
                if (match && match[1]) {
                    const urlExtraida = match[1];
                    if (
                        urlExtraida.includes("docstore/document.seam") || 
                        urlExtraida.includes("download.seam") || 
                        urlExtraida.includes("reportReciboPDF.seam")
                    ) {
                        potentialLinks.push(urlExtraida);
                    }
                }
            }

            // Si no encontramos enlaces, nos saltamos esta fila
            if (potentialLinks.length === 0) {
                continue;
            }

            // Ordenar enlaces: preferir reportReciboPDF o download.seam (que suelen ser PDFs reales) antes que documentoSemLoginHTML (HTML)
            potentialLinks.sort((a, b) => {
                const aIsPdf = a.includes("reportReciboPDF") || a.includes("download.seam");
                const bIsPdf = b.includes("reportReciboPDF") || b.includes("download.seam");
                return (aIsPdf === bIsPdf) ? 0 : aIsPdf ? -1 : 1;
            });

            // Extraer algún texto para usarlo como nombre de archivo
            const nombreDocumento =
            $detalle(docFila).find("td").first().text().trim() || `doc_${i}_${j}`;
            const idLimpio = nombreDocumento
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase();

            let savedFileName: string | null = null;
            
            // Intentar descargar usando los enlaces encontrados en orden de preferencia
            for (const link of potentialLinks) {
                const docData = {
                    id: `${idLimpio}_${i}_${j}`,
                    title: nombreDocumento,
                    pdfUrl: new URL(link, BASE_URL).href,
                };
                allData.push(docData);
                
                savedFileName = await downloadPdf(docData, userDownloadDir, 2); // reducimos reintentos a 2 por enlace para no tardar tanto
                if (savedFileName) {
                    break; // Tuvimos éxito con este enlace, no probar los siguientes fallbacks
                }
            }
            
            if (savedFileName) {
                totalDescargas++;
                bitacoraEntry.archivos.push(savedFileName);
            }
            
            // Delay cortés para no saturar al servidor
            await new Promise(r => setTimeout(r, 1000));
        }
        
        if (bitacoraEntry.archivos.length > 0) {
            bitacora.push(bitacoraEntry);
            
            // Guardado incremental para no perder datos si el script se interrumpe
            fs.writeFileSync('results.json', JSON.stringify(allData, null, 2));
            
            let mdContent = `# Bitácora de Descargas\n\nGenerado: ${new Date().toLocaleString()}\n\n`;
            for (const b of bitacora) {
                mdContent += `## Proceso: ${b.procesoTexto}\n`;
                mdContent += `- **Enlace Detalles:** ${b.detalleUrl}\n`;
                mdContent += `### Archivos Descargados:\n`;
                for (const arch of b.archivos) {
                    mdContent += `- \`${arch}\`\n`;
                }
                mdContent += `\n---\n\n`;
            }
            fs.writeFileSync('bitacora.md', mdContent);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`¡Scraping completado!`);
    console.log(`Documentos PDF válidos descargados con éxito: ${totalDescargas}`);
    if (isTestMode && totalDescargas < 5) {
        console.log(`Nota: Se solicitó un límite de 5 PDFs para la prueba, pero solo se pudieron descargar ${totalDescargas} de manera exitosa en las primeras filas escaneadas.`);
    }
    console.log(`Resultados guardados en results.json`);
    console.log(`Bitácora guardada en bitacora.md`);
    console.log(`========================================\n`);
}

main().catch(console.error);
