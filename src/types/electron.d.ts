interface ElectronAPI {
    ipcRenderer: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    };
  }
  
  declare global {
    interface Window {
      electron: ElectronAPI;
    }
  }
  
  export {};