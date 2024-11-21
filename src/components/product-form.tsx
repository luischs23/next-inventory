'use client'

import { useState, useMemo,  } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from '../services/firebase/firebase.config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface SizeInputs {
  [key: string]: SizeInput
}

interface ProductFormData {
  brand: Brand
  reference: string
  color: string
  gender: Gender
  sizes: SizeInputs
  total: number
  comments: string
  image: File | null
  imageUrl: string
  baseprice: number
  saleprice: number
}

export const ProductFormComponent: React.FC = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<ProductFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    sizes: {},
    total: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: 0,
    saleprice: 0
  })

  const total = useMemo(() => {
    return Object.values(formData.sizes).reduce((sum, size) => sum + size.quantity, 0)
  }, [formData.sizes])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSizeChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setFormData((prev) => ({
      ...prev,
      sizes: { 
        ...prev.sizes, 
        [size]: { 
          quantity, 
          barcodes: Array(quantity).fill('').map(() => generateBarcode())
        } 
      },
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = '';

      // Si hay una imagen seleccionada, subirla a Firebase Storage
      if (formData.image) {
        const imageRef = ref(storage, `products/${formData.image.name}`);
        await uploadBytes(imageRef, formData.image);
        imageUrl = await getDownloadURL(imageRef);

        // Update the imageUrl in the formData state
        setFormData((prev) => ({ ...prev, imageUrl }));
      }

      // Guardar los datos del producto en Firestore
      await addDoc(collection(db, 'products'), {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        sizes: formData.sizes,
        total,
        comments: formData.comments,
        imageUrl, // Guarda la URL de la imagen subida
        baseprice: formData.baseprice,
        saleprice: formData.saleprice
      });

      // Limpiar el formulario
      setFormData({
        brand: 'Nike',
        reference: '',
        color: '',
        gender: 'Dama',
        sizes: {},
        total:0,
        comments: '',
        image: null,
        imageUrl: '',
        baseprice: 0,
        saleprice: 0
      });

    } catch (error) {
      console.error('Error al guardar el producto:', error);
    }
  };

  const sizeInputs = formData.gender === 'Dama'
    ? ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
    : ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Select name="brand" onValueChange={(value: Brand) => setFormData((prev) => ({ ...prev, brand: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nike">Nike</SelectItem>
                <SelectItem value="Adidas">Adidas</SelectItem>
                <SelectItem value="Puma">Puma</SelectItem>
                <SelectItem value="Reebok">Reebok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" value={formData.reference} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" value={formData.color} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="commets">Comments</Label>
            <Input id="comments" name="comments" value={formData.comments} onChange={handleInputChange} />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="gender">Gender</Label>
            <Switch
              id="gender"
              checked={formData.gender === 'Hombre'}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, gender: checked ? 'Hombre' : 'Dama' }))}
            />
            <span>{formData.gender}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {sizeInputs.map((size) => (
              <div key={size}>
                <Label htmlFor={size}>{size}</Label>
                <Input
                  id={size}
                  type="number"
                  value={formData.sizes[size]?.quantity || ''}
                  onChange={(e) => handleSizeChange(size, e.target.value)}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                value={total}
                readOnly
              />
            </div>
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <div className='flex items-center space-x-4'>
          <div>
              <Label htmlFor="baseprice">Base Price</Label>
              <Input
                id="baseprice"
                name="baseprice"
                type="number"
                value={formData.baseprice}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="saleprice">Sale Price</Label>
              <Input
                id="saleprice"
                name="saleprice"
                type="number"
                value={formData.saleprice}
                onChange={handleInputChange}
              />
            </div>
            </div>
          <Button type="submit" onClick={() => router.push('/inventory')}>Save Product</Button>
        </form>
      </CardContent>
    </Card>
  )
}