'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table"
import Image from 'next/image'
import { ScrollArea, ScrollBar } from "app/components/ui/scroll-area"
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

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

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#E4E4E4',
    padding: 10,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '12.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    fontSize: 10,
  },
})

const PDFDocument = ({ products, storeName }: { products: ExhibitionProduct[], storeName: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>{storeName} Exhibition Inventory</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Brand</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Reference</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Color</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Gender</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Size</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Barcode</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Base Price</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>Sale Price</Text>
            </View>
          </View>
          {products.map((product) => (
            <View style={styles.tableRow} key={product.id}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.brand}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.reference}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.color}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.gender}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.exhibitionSize}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.exhibitionBarcode}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.baseprice}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{product.saleprice}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
)

export default function InventoryExbPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ExhibitionProduct[]>([])
  const [stores, setStores] = useState<{ [id: string]: string }>({})
  const [selectedStore, setSelectedStore] = useState<string | null>(null)

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
    setSelectedStore(storeId)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exhibition Inventory</CardTitle>
          {selectedStore && (
            <PDFDownloadLink
              document={<PDFDocument products={products} storeName={stores[selectedStore]} />}
              fileName={`${stores[selectedStore]}_exhibition_inventory.pdf`}
            >
              {({ blob, url, loading, error }) => 
                <Button disabled={loading}>
                  {loading ? 'Generating PDF...' : 'Export PDF'}
                </Button>
              }
            </PDFDownloadLink>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {Object.entries(stores).map(([storeId, storeName]) => (
              <Button key={storeId} onClick={() => fetchProductsForStore(storeId)}>
                {storeName}
              </Button>
            ))}
          </div>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <Button onClick={() => router.push(`/update-product/${product.id}`)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}