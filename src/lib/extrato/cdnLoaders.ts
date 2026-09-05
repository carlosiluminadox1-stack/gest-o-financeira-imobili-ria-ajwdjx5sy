/**
 * Utilitários para carregamento dinâmico de bibliotecas pesadas de parsing (PDF.js e SheetJS)
 * através de CDN com cache e fallback, sem inchar o bundle inicial da aplicação.
 */

declare global {
  interface Window {
    pdfjsLib?: any
    XLSX?: any
  }
}

let pdfjsLoadingPromise: Promise<any> | null = null
let xlsxLoadingPromise: Promise<any> | null = null

export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Ambiente de navegador necessário para carregar PDF.js')
  }

  if (window.pdfjsLib) {
    return window.pdfjsLib
  }

  if (pdfjsLoadingPromise) {
    return pdfjsLoadingPromise
  }

  pdfjsLoadingPromise = new Promise((resolve, reject) => {
    // Versão 3.11.174 legacy UMD estável e amplamente compatível
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      } else {
        reject(new Error('PDF.js carregado mas window.pdfjsLib não foi encontrado'))
      }
    }

    script.onerror = () => {
      // Fallback para cdnjs alternativo ou unpkg
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
      fallbackScript.async = true
      fallbackScript.crossOrigin = 'anonymous'

      fallbackScript.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
          resolve(window.pdfjsLib)
        } else {
          reject(new Error('Falha ao inicializar PDF.js após fallback'))
        }
      }

      fallbackScript.onerror = () => {
        reject(
          new Error(
            'Não foi possível carregar a biblioteca de leitura de PDF. Verifique a conexão com a internet.',
          ),
        )
      }

      document.head.appendChild(fallbackScript)
    }

    document.head.appendChild(script)
  })

  return pdfjsLoadingPromise
}

export async function loadXlsx(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Ambiente de navegador necessário para carregar XLSX')
  }

  if (window.XLSX) {
    return window.XLSX
  }

  if (xlsxLoadingPromise) {
    return xlsxLoadingPromise
  }

  xlsxLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.async = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX)
      } else {
        reject(new Error('XLSX carregado mas window.XLSX não foi encontrado'))
      }
    }

    script.onerror = () => {
      // Fallback para unpkg
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
      fallbackScript.async = true
      fallbackScript.crossOrigin = 'anonymous'

      fallbackScript.onload = () => {
        if (window.XLSX) {
          resolve(window.XLSX)
        } else {
          reject(new Error('Falha ao inicializar XLSX após fallback'))
        }
      }

      fallbackScript.onerror = () => {
        reject(
          new Error(
            'Não foi possível carregar a biblioteca de leitura de planilhas. Verifique a conexão.',
          ),
        )
      }

      document.head.appendChild(fallbackScript)
    }

    document.head.appendChild(script)
  })

  return xlsxLoadingPromise
}
