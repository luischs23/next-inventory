'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table"
import Image from 'next/image'

interface ExhibitionProduct {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  exhibitionSize: string
  exhibitionBarcode: string
  imageUrl: string
  baseprice: number
  saleprice: number
}

export default function InventoryExbPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ExhibitionProduct[]>([])
  const [stores, setStores] = useState<{ [id: string]: string }>({})

  useEffect(() => {
    const fetchStores = async () => {
      const storesSnapshot = await getDocs(collection(db, 'stores'))
      const storesData = storesSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().name
        return acc
      }, {} as { [id: string]: string })
      setStores(storesData)
    }

    fetchStores()
  }, [])

  const fetchProductsForStore = async (storeId: string) => {
    const productsSnapshot = await getDocs(collection(db, 'exhibition', storeId, 'products'))
    const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExhibitionProduct))
    setProducts(productsData)
  }

  return (
    <Card className="w-full max-w-6xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Exhibition Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center space-x-4 mb-4">
          {Object.entries(stores).map(([storeId, storeName]) => (
            <Button key={storeId} onClick={() => fetchProductsForStore(storeId)}>
              {storeName}
            </Button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Sale Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="relative w-16 h-16">
                    <Image
                      src={product.imageUrl}
                      alt={product.reference}
                      fill
                      sizes="(max-width: 64px) 100vw, 64px"
                      className="object-cover rounded-md"
                    />
                  </div>
                </TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell>{product.reference}</TableCell>
                <TableCell>{product.color}</TableCell>
                <TableCell>{product.gender}</TableCell>
                <TableCell>{product.exhibitionSize}</TableCell>
                <TableCell>{product.exhibitionBarcode}</TableCell>
                <TableCell>{product.baseprice}</TableCell>
                <TableCell>{product.saleprice}</TableCell>
                <TableCell>
                  <Button onClick={() => router.push(`/update-product/${product.id}`)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}