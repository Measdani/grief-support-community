'use client'

import { useParams } from 'next/navigation'
import MemorialEditor from '@/components/MemorialEditor'

export default function EditMemorialPage() {
  const params = useParams()
  const memorialId = params.id as string

  return <MemorialEditor mode="edit" memorialId={memorialId} />
}
