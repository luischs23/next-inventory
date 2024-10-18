import React from 'react';

interface LabelPreviewProps {
  text1: string;
  text2: string;
  barcode: string;
}

export default function LabelPreview({ text1, text2, barcode }: LabelPreviewProps) {
  return (
    <div className="w-[62mm] h-[29mm] bg-white border border-gray-300 p-2 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="text-sm font-bold">{text1}</div>
        <div className="text-sm">{text2}</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-32 h-8 bg-[url('/placeholder.svg?height=32&width=128')] bg-cover bg-center" />
        <div className="text-xs">{barcode}</div>
      </div>
    </div>
  );
}