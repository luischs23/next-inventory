import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Guardar los datos en la base de datos (aquí conectarías con la base de datos real)
    res.status(200).json({ message: 'Product saved!' });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}