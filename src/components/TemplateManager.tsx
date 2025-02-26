"use client"

import { useState, useEffect } from "react"
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Textarea } from "app/components/ui/textarea"
import { Label } from "app/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "app/components/ui/alert-dialog"
import { db } from "app/services/firebase/firebase.config"
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc } from "firebase/firestore"

interface Template {
  id: string
  name: string
  content: string
}

interface TemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  warehouseId: string
  onTemplatesChange: (templates: Template[]) => void
}

export function TemplateManager({ isOpen, onClose, companyId, warehouseId, onTemplatesChange }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateContent, setNewTemplateContent] = useState("")
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    const templatesRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/templates`)
    const snapshot = await getDocs(templatesRef)
    const templatesList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Template)
    setTemplates(templatesList)
    onTemplatesChange(templatesList)
  }

  const addTemplate = async () => {
    if (newTemplateName && newTemplateContent) {
      const templatesRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/templates`)
      const newDocRef = await addDoc(templatesRef, {
        name: newTemplateName,
        content: newTemplateContent,
      })
      const newTemplate = {
        id: newDocRef.id,
        name: newTemplateName,
        content: newTemplateContent,
      }
      const updatedTemplates = [...templates, newTemplate]
      setTemplates(updatedTemplates)
      onTemplatesChange(updatedTemplates)
      setNewTemplateName("")
      setNewTemplateContent("")
    }
  }

  const updateTemplate = async (template: Template) => {
    const templateRef = doc(db, `companies/${companyId}/warehouses/${warehouseId}/templates`, template.id)
    await updateDoc(templateRef, {
      name: template.name,
      content: template.content,
    })
    const updatedTemplates = templates.map((t) => (t.id === template.id ? template : t))
    setTemplates(updatedTemplates)
    onTemplatesChange(updatedTemplates)
    setEditingTemplate(null)
  }

  const deleteTemplate = async (id: string) => {
    const templateRef = doc(db, `companies/${companyId}/warehouses/${warehouseId}/templates`, id)
    await deleteDoc(templateRef)
    const updatedTemplates = templates.filter((t) => t.id !== id)
    setTemplates(updatedTemplates)
    onTemplatesChange(updatedTemplates)
  }

  const insertLabel = (label: string) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content: editingTemplate.content + `{${label}}`,
      })
    } else {
      setNewTemplateContent((prev) => prev + `{${label}}`)
    }
  }

  const renderTemplateContent = (content: string) => {
    return content.replace(/{(.*?)}/g, (match, label) => `<span class="text-blue-600 font-semibold">{${label}}</span>`)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Manage WhatsApp Templates</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          {templates.map((template) => (
            <div key={template.id} className="flex flex-col items-start gap-2">
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold">{template.name}</span>
                <div className="space-x-2">
                  <Button onClick={() => setEditingTemplate(template)} variant="outline" size="sm">
                    Update
                  </Button>
                  <Button onClick={() => deleteTemplate(template.id)} variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
              {editingTemplate?.id === template.id ? (
                <div className="w-full space-y-2">
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="Template name"
                  />
                  <Textarea
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                    placeholder="Template content"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => setEditingTemplate(null)} variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button onClick={() => updateTemplate(editingTemplate)} size="sm">
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm bg-gray-100 p-2 rounded w-full dark:bg-gray-700"
                  dangerouslySetInnerHTML={{ __html: renderTemplateContent(template.content) }}
                />
              )}
            </div>
          ))}
          <Label htmlFor="new-template-name">New Template Name</Label>
          <Input
            id="new-template-name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Enter template name"
          />
          <Label htmlFor="new-template-content">New Template Content</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {["brand", "reference", "color", "gender", "price"].map((label) => (
              <Button key={label} onClick={() => insertLabel(label)} size="sm" variant="outline">
                Insert {label}
              </Button>
            ))}
          </div>
          <Textarea
            id="new-template-content"
            value={newTemplateContent}
            onChange={(e) => setNewTemplateContent(e.target.value)}
            placeholder="Enter template content"
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setNewTemplateName("")
                setNewTemplateContent("")
                onClose()
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={addTemplate}>
              Add Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

