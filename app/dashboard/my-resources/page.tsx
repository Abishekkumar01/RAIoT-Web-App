"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/contexts/AuthContext"
import { FileText, Download, Calendar } from "lucide-react"
import { MemberResource } from "@/lib/types/resource"
import { Button } from "@/components/ui/button"

export default function MyResourcesPage() {
  const { user: currentUser } = useAuth()
  const [resources, setResources] = useState<MemberResource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) return

    const q = query(
      collection(db, "member_resources"),
      where("userId", "==", currentUser.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedResources = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MemberResource[]
      
      // Sort by uploadedAt descending locally
      fetchedResources.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0))
      
      setResources(fetchedResources)
      setLoading(false)
    })

    return () => unsubscribe()
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
              </div>
              
              <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 mt-auto">
                <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-zinc-800 hover:bg-purple-600 text-white transition-colors" variant="secondary">
                    <Download className="mr-2 h-4 w-4" /> Download File
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}