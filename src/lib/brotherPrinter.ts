import path from 'path';
import winax from 'winax';

interface PrintLabelData {
  text1: string;
  text2: string;
  text3: string;
  text4: string;
  barcode: string;
  date?: string;
}

export async function printLabel(data: PrintLabelData, isBox: boolean): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side');
  }

  return new Promise((resolve, reject) => {
    try {
      console.log('Starting print job...');

      const bpac = new winax.Object('bpac.Document');
      
      const templatePath = path.join(process.cwd(), 'public', isBox ? 'box_template.lbx' : 'label_template.lbx');
      
      if (!bpac.Open(templatePath)) {
        throw new Error('Failed to open template file');
      }

      // Set the printer
      bpac.SetPrinter('Brother QL-800', true);

      // Update the text fields with error checking
      const textFields = ['text1', 'text2', 'text3', 'text4'] as const;
      textFields.forEach((field) => {
        const obj = bpac.GetObject(field);
        if (obj) {
          obj.Text = data[field].toUpperCase();
        } else {
          console.warn(`Field ${field} not found in template`);
        }
      });

      // Update the barcode
      const barcodeObj = bpac.GetObject('barcode');
      if (barcodeObj) {
        barcodeObj.Text = data.barcode;
      } else {
        console.warn('Barcode field not found in template');
      }

      // Update the date field for box labels
      if (isBox && data.date) {
        const dateObj = bpac.GetObject('date');
        if (dateObj) {
          dateObj.Text = new Date(data.date).toLocaleDateString();
        } else {
          console.warn('Date field not found in template');
        }
      }

      // Print the label
      if (!bpac.StartPrint('', 0)) {
        throw new Error('Failed to start print job');
      }

      if (!bpac.PrintOut(1, 0)) {
        throw new Error('Failed to print label');
      }

      bpac.EndPrint();
      bpac.Close();

      console.log('Print job completed successfully');
      resolve('Label printed successfully');
    } catch (error) {
      console.error('Error in printLabel function:', error);
      reject(`Error printing label: ${error}`);
    }
  });
}