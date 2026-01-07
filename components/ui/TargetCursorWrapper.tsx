"use client"

import dynamic from 'next/dynamic'

const TargetCursor = dynamic(() => import('./TargetCursor.jsx'), {
    ssr: false,
})

export default TargetCursor
