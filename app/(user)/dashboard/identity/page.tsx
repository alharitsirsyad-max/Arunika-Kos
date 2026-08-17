import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UnifiedIdentityForm } from '@/components/identity/UnifiedIdentityForm'
import { ReVerificationBanner } from '@/components/identity/ReVerificationBanner'
import { DeleteAccountSection } from '@/components/identity/DeleteAccountSection'

export default async function IdentityPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Identitas &amp; Dokumen</h1>
          <p className="text-muted-foreground mt-1">Kelola data diri, kontak darurat, dan dokumen identitas Anda.</p>
        </div>
        <ReVerificationBanner />
        <UnifiedIdentityForm />
        <DeleteAccountSection />
      </div>
    </main>
  )
}
