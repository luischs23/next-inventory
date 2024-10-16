declare module 'quagga' {
    export interface QuaggaJSResultObject {
      codeResult: {
        code: string;
        format: string;
      };
    }
  
    export interface QuaggaJSConfiguration {
      inputStream: {
        type: string;
        constraints: {
          width?: number | { min: number };
          height?: number | { min: number };
          facingMode?: string;
        };
        target?: HTMLElement | null;
      };
      locator?: {
        patchSize?: string;
        halfSample?: boolean;
      };
      numOfWorkers?: number;
      decoder?: {
        readers: string[];
      };
      locate?: boolean;
    }
  
    export function init(
      config: QuaggaJSConfiguration,
      callback: (err: any) => void
    ): void;
  
    export function start(): void;
  
    export function stop(): void;
  
    export function onDetected(callback: (result: QuaggaJSResultObject) => void): void;
  
    export function offDetected(callback: (result: QuaggaJSResultObject) => void): void;
  }