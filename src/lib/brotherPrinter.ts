interface PrintLabelData {
  text1: string;
  text2: string;
  text3: string;
  text4: string;
  barcode: string;
  date?: string;
}

export async function printLabel(data: PrintLabelData, isBox: boolean): Promise<string> {
  console.log('Print request received:', { data, isBox });
  return 'Print request logged (actual printing occurs on Windows backend)';
}