'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Quagga from 'quagga'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "app/components/ui/dialog"
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { toast } from "app/components/ui/use-toast"
import { Camera, Keyboard } from 'lucide-react'

interface ScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (result: string) => void
}

export function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
  const [isManualInput, setIsManualInput] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLDivElement>(null)
  const quaggaInitialized = useRef(false)

  const checkCameraAvailability = useCallback(() => {
    return navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        if (videoDevices.length > 0) {
          console.log('Cámara disponible')
          return true
        } else {
          console.log('No hay cámaras disponibles')
          setCameraError('No se ha detectado una cámara')
          return false
        }
      })
      .catch(error => {
        console.error('Error detectando dispositivos:', error)
        setCameraError('Error detectando la cámara')
        return false
      })
  }, [])

  const initializeScanner = useCallback(() => {
    console.log("Inicializando escáner...")
    if (videoRef.current && !quaggaInitialized.current) {
      checkCameraAvailability().then(cameraAvailable => {
        if (!cameraAvailable) return

        Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              constraints: {
                width: { min: 1280 },
                height: { min: 720 },
                facingMode: 'environment',
              },
              target: videoRef.current,
            },
            locator: {
              patchSize: 'medium',
              halfSample: true,
            },
            numOfWorkers: Math.min(navigator.hardwareConcurrency || 4, 4),
            decoder: {
              readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'code_39_reader', 'code_39_vin_reader', 'codabar_reader', 'upc_reader', 'upc_e_reader'],
            },
            locate: true,
          },
          (err: any) => {
            if (err) {
              console.error('Error inicializando Quagga:', err)
              setCameraError(`Error inicializando el escáner de códigos de barras: ${err.message || 'Error desconocido'}`)
              return
            }
            console.log("Quagga inicializado correctamente")
            quaggaInitialized.current = true
            Quagga.start()
            enableContinuousFocus()
          }
        )

        Quagga.onDetected((result: Quagga.QuaggaJSResultObject) => {
          if (result.codeResult.code) {
            console.log("Código de barras detectado:", result.codeResult.code)
            onScan(result.codeResult.code)
            toast({
              title: "Código escaneado",
              description: `Se ha detectado el código: ${result.codeResult.code}`,
              duration: 2000,
            })
            setTimeout(() => {
              onClose()
            }, 1000)
          }
        })
      })
    } else {
      console.log("El escáner ya está inicializado o la referencia de video no está disponible")
    }
  }, [onScan, onClose, checkCameraAvailability])

  const enableContinuousFocus = () => {
    const videoElement = videoRef.current?.querySelector('video')
    if (videoElement) {
      const stream = videoElement.srcObject as MediaStream
      const track = stream?.getVideoTracks()[0]

      if (track && track.getCapabilities && 'focusMode' in track.getCapabilities()) {
        track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet]
        }).catch(error => {
          console.error('Error al aplicar el enfoque continuo:', error)
        })
      }
    }
  }

  const stopScanner = useCallback(() => {
    if (quaggaInitialized.current) {
      console.log("Deteniendo Quagga...")
      Quagga.stop()
      Quagga.offDetected(() => {})
      quaggaInitialized.current = false
    }
  }, [])

  useEffect(() => {
    if (isOpen && !isManualInput) {
      console.log("Modal abierto, inicializando escáner...")
      initializeScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, isManualInput, initializeScanner, stopScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim())
      onClose()
    } else {
      toast({
        title: "Entrada inválida",
        description: "Por favor, ingrese un código de barras válido.",
        variant: "destructive",
      })
    }
  }

  const toggleInputMethod = () => {
    setIsManualInput(!isManualInput)
    setCameraError(null)
    if (isManualInput) {
      // Switching to camera mode
      setTimeout(() => {
        initializeScanner()
      }, 0)
    } else {
      // Switching to manual input
      stopScanner()
    }
  }

  const handleTouchFocus = (event: React.TouchEvent<HTMLDivElement>) => {
    const videoElement = videoRef.current?.querySelector('video')
    if (videoElement) {
      const touch = event.touches[0]
      const rect = videoElement.getBoundingClientRect()
      const x = (touch.clientX - rect.left) / rect.width
      const y = (touch.clientY - rect.top) / rect.height

      const stream = videoElement.srcObject as MediaStream
      const track = stream?.getVideoTracks()[0]

      if (track && track.getCapabilities && 'focusMode' in track.getCapabilities()) {
        track.applyConstraints({
          advanced: [{ 
            focusMode: 'manual',
            focusDistance: Math.sqrt(x * x + y * y)
          } as MediaTrackConstraintSet]
        }).catch(error => {
          console.error('Error al aplicar el enfoque manual:', error)
        })
      }
    }
  }

  const handleClose = useCallback(() => {
    stopScanner()
    onClose()
  }, [onClose, stopScanner])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isManualInput ? "Ingresar código manualmente" : "Escanear código de barras"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isManualInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Ingrese el código de barras"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <Button type="submit">Enviar</Button>
            </form>
          ) : (
            <div 
              ref={videoRef}
              className="relative overflow-hidden" 
              style={{ width: '100%', height: '300px' }}
              onTouchStart={handleTouchFocus}
            >
              {cameraError && (
                <div className="text-red-500 mb-4">
                  Error al acceder a la cámara: {cameraError}
                </div>
              )}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                <div className="w-full h-full border-2 border-red-500 opacity-50" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500" />
              </div>
              <style jsx>{`
                .drawingBuffer {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  max-width: 100%;
                  max-height: 100%;
                  width: auto !important;
                  height: auto !important;
                  object-fit: contain;
                }
              `}</style>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
          <Button onClick={toggleInputMethod}>
            {isManualInput ? <Camera className="mr-2" /> : <Keyboard className="mr-2" />}
            {isManualInput ? "Cambiar a cámara" : "Entrada manual"}
          </Button>
          <Button onClick={handleClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}