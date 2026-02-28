declare module 'latex.js' {
  export interface HtmlGeneratorOptions {
    hyphenate?: boolean;
  }

  export class HtmlGenerator {
    constructor(options?: HtmlGeneratorOptions);
  }

  export interface LatexGenerator {
    domFragment(): DocumentFragment;
    stylesAndScripts(): string;
  }

  export function parse(latex: string, options?: { generator?: HtmlGenerator }): LatexGenerator;
}

declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: { unit?: string; format?: string; orientation?: 'portrait' | 'landscape' };
  }

  interface Html2PdfInstance {
    set(opt: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
  }

  function html2pdf(): Html2PdfInstance;
  export default html2pdf;
}
