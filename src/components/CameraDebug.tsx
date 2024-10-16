import React, { useState, useEffect } from 'react'
import { Button } from "app/components/ui/button"

export function CameraDebug() {
  const [cameraStatus, setCameraStatus] = useState<string>('Checking...')

  const checkCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      if (videoDevices.length > 0) {
        setCameraStatus(`Found ${videoDevices.length} camera(s)`)
      } else {
        setCameraStatus('No cameras found')
      }
    } catch (err) {
      setCameraStatus(`Error checking camera: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  useEffect(() => {
    checkCamera()
  }, [])

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-md">
      <h3 className="text-lg font-semibold mb-2">Camera Debug</h3>
      <p>Status: {cameraStatus}</p>
      <Button onClick={checkCamera} className="mt-2">
        Recheck Camera
      </Button>
    </div>
  )
}