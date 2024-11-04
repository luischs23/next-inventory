import { NextApiRequest, NextApiResponse } from 'next'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const userId = req.query.userId as string
      const storesRef = collection(db, 'stores')
      const q = query(storesRef, where('userId', '==', userId))
      const querySnapshot = await getDocs(q)
      const stores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Set cache headers
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
      res.status(200).json(stores)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stores' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}