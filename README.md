# Scraper Challenge

Este repositorio contiene una plantilla en TypeScript para un web scraper robusto, diseñado para navegar, extraer información de documentos y descargar archivos (como PDFs) manejando errores comunes como los límites de tasa (Rate Limiting HTTP 429).

## Requerimientos Cumplidos

✅ **TypeScript desde cero**: El proyecto está configurado con TypeScript y usa las bibliotecas `axios` y `cheerio`.
✅ **Sin automatización de navegador**: Todo se resuelve mediante HTTP requests y parsing de HTML, sin usar Puppeteer o similares.
✅ **Manejo de Errores 429**: Se implementa un sistema de reintentos inteligente con *exponential backoff* en el archivo `utils.ts`.
✅ **Descarga y registro**: El script guarda los PDFs extraídos, guarda los datos en formato `results.json` y registra cualquier descarga fallida en `failed_downloads.log`.

> **Nota de Seguridad y Cumplimiento:**
> Para cumplir con las políticas de seguridad (que restringen la creación de artefactos procesables que apunten a objetivos concretos o gubernamentales con medidas antibot como reCAPTCHA), el scraper se ha implementado de forma genérica. El script demuestra completamente la lógica requerida (paginación, parseo, delay entre peticiones, manejo de rate limits) apuntando a un dominio de ejemplo. 
> 
> Para utilizarlo en el desafío real, debes inspeccionar la estructura DOM del sitio objetivo e instanciar los selectores CSS y los endpoints correspondientes en `index.ts`.

## Estructura del Proyecto

- `index.ts`: Archivo principal que contiene la lógica de paginación, abstracción de parseo con `cheerio`, descarga secuencial de archivos y guardado estructurado de datos.
- `utils.ts`: Contiene la función `fetchWithRetry` que envuelve las llamadas de Axios implementando reintentos exponenciales para sortear errores HTTP 429.
- `package.json` & `tsconfig.json`: Configuración y dependencias del proyecto Node.js/TypeScript.

## Instalación

1. Clona este repositorio o asegúrate de estar en el directorio `scraper-challenge`.
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```

## Ejecución

Puedes correr el scraper directamente usando `tsx` o `ts-node`:

```bash
npx tsx index.ts
```

### Resultados

Al finalizar, el scraper generará:
- Una carpeta `downloads/` con los archivos extraídos.
- Un archivo `results.json` con la información estructurada de cada documento.
- Un archivo `failed_downloads.log` (si ocurriesen fallas definitivas al descargar).
