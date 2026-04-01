"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useAuth } from "@/lib/contexts/AuthContext"
import { FileText, Download, Calendar, Link2 } from "lucide-react"
import { MemberResource } from "@/lib/types/resource"
import { Button } from "@/components/ui/button"

export default function MyResourcesPage() {
  const { user: currentUser } = useAuth()
  const [resources, setResources] = useState<MemberResource[]>([])
  const [loading, setLoading] = useState(true)

  const handleDownload = async (res: MemberResource) => {
    try {
      if ((res.storageType || 'cloudinary') === 'link') {
        window.open(res.fileUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if ((res.storageType || 'cloudinary') === 'cloudinary') {
        window.open(res.fileUrl, '_blank', 'noopener,noreferrer')
        return
      }

      const token = await auth.currentUser?.getIdToken(true)
      if (!token) {
        alert('Authentication required to download this file.')
        return
      }

      const fileId = res.mongoFileId || res.fileUrl.split('/').pop()
      if (!fileId) {
        alert('Missing file identifier for download.')
        return
      }

      const response = await fetch(`/api/rms/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.fileName || 'resource'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || 'Unable to download file.')
    }
  }

  useEffect(() => {
    if (!currentUser?.uid) return

    const userResources = new Map<string, MemberResource>()
    const globalResources = new Map<string, MemberResource>()

    const renderMerged = () => {
      const mergedMap = new Map<string, MemberResource>([
        ...globalResources.entries(),
        ...userResources.entries(),
      ])
      const merged = Array.from(mergedMap.values())
      merged.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0))
      setResources(merged)
      setLoading(false)
    }

    const userQuery = query(
      collection(db, "member_resources"),
      where("userId", "==", currentUser.uid)
    )

    const globalQuery = query(
      collection(db, "member_resources"),
      where("userId", "==", "all")
    )

    const unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
      userResources.clear()
      snapshot.docs.forEach((doc) => {
        userResources.set(doc.id, { id: doc.id, ...doc.data() } as MemberResource)
      })
      renderMerged()
    })

    const unsubscribeGlobal = onSnapshot(globalQuery, (snapshot) => {
      globalResources.clear()
      snapshot.docs.forEach((doc) => {
        globalResources.set(doc.id, { id: doc.id, ...doc.data() } as MemberResource)
      })
      renderMerged()
    })

    return () => {
      unsubscribeUser()
      unsubscribeGlobal()
    }
  }, [currentUser])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
        <h1 className="text-3xl font-bold text-white tracking-tight">My Resources & Results</h1>
        <p className="text-zinc-400 mt-2">View test papers and other files uploaded by your coordinators.</p>
      </div>

      {resources.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <FileText className="h-16 w-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-medium text-zinc-300">No resources available</h3>
          <p className="text-zinc-500 mt-2 max-w-md">There are no files or test results uploaded for your account yet. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <div key={res.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group hover:border-purple-500/50 transition-colors flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between">
                  <div className="bg-zinc-800 p-2 rounded-md mb-4 text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-900/20 transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                  {res.uploadedAt && (
                    <div className="flex items-center text-xs text-zinc-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(res.uploadedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-zinc-200 mb-2 truncate" title={res.title}>
                  {res.title}
                </h3>
                
                {res.description && (
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                    {res.description}
                  </p>
                )}
                
                {res.fileName && (
                  <div className="text-xs font-mono text-zinc-500 truncate bg-zinc-950 p-2 rounded border border-zinc-800 mb-2">
                    {res.fileName}
                  </div>
                )}

                {res.storageType === 'link' && (
                  <div className="text-xs text-zinc-400 flex items-center gap-2 mb-2">
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="truncate" title={res.fileUrl}>External learning link</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 mt-auto">
                <Button
                  className="w-full bg-zinc-800 hover:bg-purple-600 text-white transition-colors"
                  variant="secondary"
                  onClick={() => handleDownload(res)}
                >
                  {res.storageType === 'link' ? (
                    <>
                      <Link2 className="mr-2 h-4 w-4" /> Open Link
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download File
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}