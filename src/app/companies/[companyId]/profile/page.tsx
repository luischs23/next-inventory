'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth, storage } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { User } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Image from 'next/image'
import ReactCrop, { Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from "app/components/ui/button"
import { useToast } from "app/components/ui/use-toast"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "app/components/ui/alert-dialog"
import { ArrowLeft, Camera, ChevronRight, HelpCircle, Loader2, LogOut, RotateCw, Settings, Undo, UserIcon } from 'lucide-react'

interface UserProfile {
id: string
name: string
surname: string
email: string
phone: string
cc: string
location: string
role: string
companyId: string
photo: string
}

export default function ProfilePage({ params }: { params: { companyId: string } }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [, setCompanyName] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showUpdatePhotoDialog, setShowUpdatePhotoDialog] = useState(false)
    const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        })
    const [rotation, setRotation] = useState(0)
    const [previousRotation, setPreviousRotation] = useState(0)
    const imageRef = useRef<HTMLImageElement>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const lastConnection = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const router = useRouter()
    const { toast } = useToast()

useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
    setUser(user)
    if (user) {
        fetchUserProfile(user.uid)
        fetchCompanyName()
    } else {
        setLoading(false)
        router.push('/login')
    }
    })

    return () => unsubscribe()
}, [params.companyId, router])

const fetchCompanyName = async () => {
    try {
    const companyRef = doc(db, 'companies', params.companyId)
    const companySnap = await getDoc(companyRef)
    
    if (companySnap.exists()) {
        setCompanyName(companySnap.data().name)
    } else {
        console.error('Company not found')
        router.push('/companies')
    }
    } catch (error) {
    console.error('Error fetching company:', error)
    toast({
        title: "Error",
        description: "Failed to fetch company information",
        variant: "destructive",
    })
    }
}

const fetchUserProfile = async (uid: string) => {
    try {
    const userQuery = query(
        collection(db, `companies/${params.companyId}/users`),
        where('uid', '==', uid)
    )
    
    const userSnapshot = await getDocs(userQuery)
    
    if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data() as UserProfile
        setProfile({ ...userData, id: userSnapshot.docs[0].id })
    } else {
        console.error('User document not found')
        toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
        })
    }
    } catch (error) {
    console.error('Error fetching user profile:', error)
    toast({
        title: "Error",
        description: "Failed to fetch user profile",
        variant: "destructive",
    })
    } finally {
    setLoading(false)
    }
}

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
        setNewPhotoFile(file)
        const objectUrl = URL.createObjectURL(file)
        setNewPhotoPreview(objectUrl)
    }
    }

const handleRotate = () => {
    setPreviousRotation(rotation)
    setRotation((prev) => (prev + 90) % 360)
    }

    const handleUndo = () => {
    setRotation(previousRotation)
    }

const getCroppedImg = async (
    image: HTMLImageElement,
    crop: Crop,
    rotation = 0
    ): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('No 2d context')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Set desired output size (e.g., 500x500 pixels)
    const outputSize = 500

    canvas.width = outputSize
    canvas.height = outputSize

    ctx.imageSmoothingQuality = 'high'

    const rotRad = (rotation * Math.PI) / 180

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rotRad)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    )

    ctx.restore()

    return new Promise((resolve) => {
        canvas.toBlob(
        (blob) => {
            if (!blob) {
            throw new Error('Canvas is empty')
            }
            resolve(blob)
        },
        'image/jpeg',
        0.8 // Adjust quality (0.8 = 80% quality)
        )
    })
    }

const handleCloseDialog = () => {
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    setRotation(0)
    setPreviousRotation(0)
    setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
})
}

const handleUpdatePhoto = async () => {
if (!user || !profile || !newPhotoFile || !imageRef.current) return

setIsUpdating(true)
try {
    const croppedImage = await getCroppedImg(imageRef.current, crop, rotation)
    const storageRef = ref(storage, `companies/${params.companyId}/profile/${profile.id}`)
    await uploadBytes(storageRef, croppedImage)
    const downloadURL = await getDownloadURL(storageRef)

    const userRef = doc(db, `companies/${params.companyId}/users`, profile.id)
    await updateDoc(userRef, {
    photo: downloadURL
    })

    setProfile({ ...profile, photo: downloadURL })
    setShowUpdatePhotoDialog(false)
    setNewPhotoFile(null)
    setNewPhotoPreview(null)
    setRotation(0)
    setPreviousRotation(0)
    toast({
    title: "Success",
    description: "Profile photo updated successfully",
    style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
    })
} catch (error) {
    console.error('Error updating profile photo:', error)
    toast({
    title: "Error",
    description: "Failed to update profile photo",
    variant: "destructive",
    })
} finally {
    setIsUpdating(false)
}
}

if (loading) {
    return <div>Loading...</div>
}

if (!profile) {
    return <div>No profile found</div>
}

return (
    <div className="container mx-auto p-4 mb-20 bg-white ">
        <div className="p-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-black"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span className="ml-2 text-lg text-black">Your profile</span>
    </div>
    <main className='mb-44'>
    <div className="flex flex-col items-center mt-4 mb-8 bg-white">
        <div className="relative">
          {profile.photo ? (
            <Image
              src={profile.photo}
              alt="Profile"
              width={120}
              height={120}
              className="rounded-full"
              priority
            />
          ) : (
            <div className="w-[120px] h-[120px] bg-gray-600 rounded-full flex items-center justify-center">
              <UserIcon className="w-16 h-16" />
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-0 right-0 rounded-full bg-gray-100 hover:bg-gray-200"
            onClick={() => setShowUpdatePhotoDialog(true)}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
             <h2 className="mt-4 text-xl font-semibold text-black">{`${profile.name} ${profile.surname}`}</h2>
        </div>
          {/* Menu Items */}
      <div className="px-4 space-y-3">
        <Button
          variant="ghost"
          className="w-full bg-black/10 hover:bg-black/20 justify-between h-14"
          onClick={() => setShowSettingsDialog(true)}
        >
          <div className="flex items-center text-black">
            <Settings className="mr-2 h-5 w-5 " />
            <span>Ajustes</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          className="w-full bg-black/10 hover:bg-black/20 justify-between h-14"
        >
          <div className="flex items-center text-black">
            <HelpCircle className="mr-2 h-5 w-5" />
            <span>Ayuda</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-400 mb-4"
          onClick={() => auth.signOut()}
        >
          <LogOut className="mr-2 h-5 w-5" />
          <span>Salir</span>
        </Button>
        <div className="text-sm text-gray-400 flex justify-between">
          <span>Última conexión {lastConnection}</span>
        </div>
      </div>
    <AlertDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información del perfil</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 text-black">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Email</label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teléfono</label>
              <p className="text-sm">{profile.phone}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">C.C.</label>
              <p className="text-sm">{profile.cc}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Ubicación</label>
              <p className="text-sm">{profile.location}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rol</label>
              <p className="text-sm">{profile.role}</p>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    <AlertDialog 
        open={showUpdatePhotoDialog} 
        onOpenChange={(open) => {
          setShowUpdatePhotoDialog(open)
          if (!open) {
            handleCloseDialog()
          }
        }}
      >
    <AlertDialogContent className="text-white max-w-md">
        <AlertDialogHeader>
        <AlertDialogTitle>Edita la foto de tu perfil</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
        <div className="flex justify-center">
            {newPhotoPreview ? (
            <div className="relative w-full max-w-[300px] aspect-square">
                <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                className="max-h-[300px]"
                >
                 <img
                      ref={imageRef}
                      src={newPhotoPreview}
                      alt="New profile photo"
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className="max-w-full h-auto"
                    />
                </ReactCrop>
            </div>
            ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
            </div>
            )}
        </div>
        <div className="flex justify-center space-x-4">
            <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleRotate}
            >
            <RotateCw className="h-4 w-4  text-black" />
            </Button>
            <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleUndo}
            >
            <Undo className="h-4 w-4 text-black" />
            </Button>
        </div>
        <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
        />  
        {!newPhotoFile && (
            <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            >
            Choose Photo
            </Button>
        )}
        {newPhotoFile && (
            <Button
            onClick={handleUpdatePhoto}
            className="w-full"
            disabled={isUpdating}
            >
            {isUpdating ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
                </>
            ) : (
                'Ready'
            )}
            </Button>
        )}
        </div>
    </AlertDialogContent>
    </AlertDialog>
    </main>
    </div>
)
}