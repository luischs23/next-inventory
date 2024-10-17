'use client'
/// <reference path="../types/quagga.d.ts" />

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "app/components/ui/dialog"
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { toast } from "app/components/ui/use-toast"
import { Camera, Keyboard } from 'lucide-react'
import Quagga from 'quagga';
import type { QuaggaJSResultObject, QuaggaJSConfiguration } from 'quagga';

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

  const initializeScanner = useCallback(() => {
    if (videoRef.current) {
      const config: QuaggaJSConfiguration = {
        inputStream: {
          type: "LiveStream",
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          },
          target: videoRef.current
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 4,
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "code_39_vin_reader", "codabar_reader", "upc_reader", "upc_e_reader"]
        },
        locate: true
      }

      Quagga.init(
        config,
        (err) => {
          if (err) {
            console.error("Error initializing Quagga:", err)
            setCameraError(`Error initializing scanner: ${err}`)
            return
          }
          console.log("Quagga initialization succeeded")
          Quagga.start()
        }
      )

      Quagga.onDetected((result: QuaggaJSResultObject) => {
        if (result.codeResult.code) {
          onScan(result.codeResult.code)
          toast({
            title: "Code scanned",
            description: `Detected code: ${result.codeResult.code}`,
            duration: 2000,
          })
          setTimeout(() => {
            onClose()
          }, 1000)
        }
      })
    }
  }, [onClose, onScan])

  const stopScanner = useCallback(() => {
    Quagga.stop()
  }, [])

  useEffect(() => {
    if (isOpen && !isManualInput) {
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
        title: "Invalid input",
        description: "Please enter a valid barcode.",
        variant: "destructive",
      })
    }
  }

  const toggleInputMethod = () => {
    setIsManualInput(!isManualInput)
    setCameraError(null)
    if (isManualInput) {
      setTimeout(() => {
        initializeScanner()
      }, 0)
    } else {
      stopScanner()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isManualInput ? "Enter code manually" : "Scan barcode"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isManualInput ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter the barcode"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <Button type="submit">Submit</Button>
            </form>
          ) : (
            <div 
              ref={videoRef}
              className="relative overflow-hidden" 
              style={{ width: '100%', height: '300px' }}
            >
              {cameraError && (
                <div className="text-red-500 mb-4">
                  {cameraError}
                </div>
              )}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                <div className="w-full h-full border-2 border-red-500 opacity-50" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500" />
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
          <Button onClick={toggleInputMethod}>
            {isManualInput ? <Camera className="mr-2" /> : <Keyboard className="mr-2" />}
            {isManualInput ? "Switch to camera" : "Manual input"}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}