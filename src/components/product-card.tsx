"use client"

import { Card, CardContent, CardFooter } from "./ui/card"
import { Button } from "./ui/button"
import { TrashIcon, PencilIcon } from 'lucide-react'

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: number }
  imageUrl: string
  total: number
}

interface ProductCardProps {
  product: Product
  onDelete: () => void
  onUpdate: () => void
}

export default function ProductCard({ product, onDelete, onUpdate }: ProductCardProps) {
  return (
    <Card className="flex">
      <div className="w-1/3">
        <img src={product.imageUrl} alt={product.reference} className="w-full h-full object-cover" />
      </div>
      <div className="w-2/3 flex flex-col">
        <CardContent className="flex-grow">
          <h3 className="font-bold">{product.brand}</h3>
          <p>Ref: {product.reference}</p>
          <p>Color: {product.color}</p>
          <p>Gender: {product.gender}</p>
          <div className="mt-2">
            <h4 className="font-semibold">Sizes:</h4>
            <ul className="grid grid-cols-3 gap-1">
              {Object.entries(product.sizes).map(([size, quantity]) => (
                <li key={size}>
                  {size}: {quantity}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 font-semibold">Total: {product.total}</p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onUpdate}>
            <PencilIcon className="h-4 w-4 mr-2" />
            Update
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </CardFooter>
      </div>
    </Card>
  )
}