declare module 'winax' {
    interface BPACObject {
      Text: string;
      // Add other properties that might be common to returned objects
    }
  
    class ActiveXObject {
      constructor(progId: string);
      Open(path: string): boolean;
      SetPrinter(printerName: string, setAsDefault: boolean): void;
      GetObject(objectName: string): BPACObject | null;
      StartPrint(jobName: string, options: number): boolean;
      PrintOut(copies: number, options: number): boolean;
      EndPrint(): void;
      Close(): void;
    }
  
    const winax: {
      Object: typeof ActiveXObject;
    };
  
    export = winax;
  }