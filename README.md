# 🚀 Desafío de Scraping - PJe Consulta Pública

Este repositorio contiene la solución completa al desafío de scraping para el portal **PJe - Consulta Pública (TRF5)**.

El objetivo principal es navegar el sitio de consulta pública, extraer información de los procesos judiciales y descargar de manera concurrente los PDFs asociados, manejando correctamente limitaciones como los errores HTTP 429 y sesiones JSF estrictas.

---

## 📋 Características Principales (Cumplimiento del Desafío)

- ✅ **Cero Automatización de Browser:** El proyecto está construido 100% sobre peticiones HTTP puras usando `axios` y analizando el DOM con `cheerio`. No se utiliza Puppeteer, Playwright ni Selenium.
- ✅ **TypeScript Estricto:** Código totalmente tipado y modularizado dentro de la carpeta `src/`.
- ✅ **Manejo de Sesión y JSF:** Implementación de `axios-cookiejar-support` y captura dinámica del token estricto `ViewState` para simular la navegación en páginas JavaServer Faces.
- ✅ **Manejo de Errores 429 (Rate Limiting):** Lógica robusta de **Exponential Backoff** implementada. Si el servidor devuelve "Too Many Requests", el scraper se pausa automáticamente y reintenta la descarga, mitigando el bloqueo. Si falla definitivamente tras múltiples intentos, registra el caso en `failed_downloads.log`.
- ✅ **Guardado Incremental e Inteligente:** Los PDFs legítimos se guardan organizados en carpetas con el nombre del proceso legal. El historial (`bitacora.md`) y la data extraída (`results.json`) se guardan de forma progresiva para evitar pérdida de datos si el script se interrumpe prematuramente.
- ✅ **Código Profesional:** El proyecto cuenta con `ESLint` y `Prettier` configurados para mantener una base de código estandarizada.

---

## 🛠️ Instalación y Requisitos

Requiere **Node.js (v18+)** instalado en tu sistema.

1. Clona este repositorio o descarga los archivos.
2. Abre la terminal en el directorio del proyecto y ejecuta la instalación de dependencias:

```bash
npm install
```

---

## 🚀 Uso y Ejecución

El proyecto incluye scripts preconfigurados en el `package.json` para facilitar su uso.

### 1. Ejecutar el Scraper (Prueba Segura)
Si quieres probar el scraper sin saturar el servidor y ver su comportamiento con rapidez, utiliza el modo de prueba. Este comando se detendrá automáticamente en cuanto logre descargar exitosamente **5 PDFs**:

```bash
npm run start:test
```

### 2. Ejecutar el Scraper (Modo Completo)
Para correr el scraper y procesar **todos** los resultados obtenidos en la búsqueda de la primera página (30 procesos predeterminados):

```bash
npm run start
```

### 3. Comandos para Desarrollo
Si modificas el código, puedes utilizar los comandos de revisión estática:

```bash
npm run lint    # Revisa el código con ESLint
npm run format  # Aplica auto-formateo con Prettier
```

---

## 📁 Estructura del Código

- `src/index.ts`: Punto de entrada de la aplicación.
- `src/config.ts`: Constantes, URLs principales y selectores de CSS para Cheerio.
- `src/types.ts`: Interfaces (Types) globales.
- `src/utils.ts`: Lógica de soporte HTTP (Configuración de Cookies con Axios) y función de reintentos exponenciales para lidiar con el error 429.
- `src/pdf.ts`: Módulo encapsulado responsable de manejar la conexión binaria, detectar enlaces trampa (HTML vs PDF reales) y escribir los ficheros localmente.
- `src/scraper.ts`: Contiene la lógica del motor de navegación a través del formulario inicial, extracción y parseo.
- `/downloads`: (Generada) Carpeta donde se guardan de manera organizada los PDFs descargados.

---

## 📝 Salidas Generadas

1. **Carpetas `downloads/[Nombre-Del-Proceso]/`**: Almacenan los PDF extraídos con nombres sanos.
2. **`results.json`**: Una volcadura de los datos serializados en JSON con el registro de IDs y URLs de origen para un análisis en backend.
3. **`bitacora.md`**: Un archivo amigable de texto en Markdown, estilo bitácora, para leer rápidamente cuántos procesos se procesaron y qué documentos se bajaron exitosamente en la última sesión.
4. **`failed_downloads.log`**: Registra URLs problemáticas (e.g., documentos clasificados o bloqueados) tras agotar el ciclo de 429 retries.

---

## 👨‍💻 Autor

**Jesús Orejarena**

- 📧 **Email:** [jesusorejarena@gmail.com](mailto:jesusorejarena@gmail.com)
- 💼 **LinkedIn:** [linkedin.com/in/jesusorejarena](https://www.linkedin.com/in/jesusorejarena/)
- 🐙 **GitHub:** [@jesusorejarena](https://github.com/jesusorejarena)
