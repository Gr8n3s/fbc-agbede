import { useState } from 'react'
import { BadgeCheck, Building2, Check, Copy, HandCoins, ShieldCheck, Wallet } from 'lucide-react'
import { Badge, Card, EmptyState, PageHeader, Rule, SectionHeading } from '@/components/ui'
import { useChurch } from '@/context/ContentContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle, useRevealAll } from '@/hooks'
import { cx } from '@/lib/utils'

export default function GivingPage() {
  const church = useChurch()
  const toast = useToast()
  useDocumentTitle('Giving', 'Church account details for tithes, offerings and donations.')

  const revealRef = useRevealAll<HTMLDivElement>()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (accountId: string, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(accountId)
      toast.success('Account number copied')
      setTimeout(() => setCopied((c) => (c === accountId ? null : c)), 2500)
    } catch {
      toast.error('Could not copy', 'Write the number down instead.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Tithes &amp; offerings"
        title="Giving"
        description="“Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.”, 2 Corinthians 9:7"
      />

      <div ref={revealRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {/*
          No payment gateway on purpose: every provider takes a cut of what the
          church receives and needs an account that eventually costs money.
          Direct bank transfer costs nothing and the money arrives in full.
        */}
        <Card className="reveal flex items-start gap-3 border-success/25 bg-success/[0.05] p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            <strong className="text-ink">Give directly to the church.</strong> These are the church’s
            own bank accounts, there is no payment processor in between, so nothing is deducted and
            your full gift reaches the church. The app never asks for your card details.
          </p>
        </Card>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Bank transfer"
            title="Church accounts"
            description="Tap any account number to copy it, then transfer from your bank app."
            className="reveal"
          />

          {church.bankAccounts.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {church.bankAccounts.map((account) => (
                <li key={account.id} className="reveal">
                  <Card className="h-full p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge tone="gold">{account.purpose}</Badge>
                        <p className="mt-2.5 flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink">
                          <Building2 className="size-4 text-ornament" aria-hidden />
                          {account.bankName}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      Account name
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] font-medium text-ink">
                      {account.accountName}
                    </p>

                    <p className="mt-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      Account number
                    </p>
                    <button
                      type="button"
                      onClick={() => void copy(account.id, account.accountNumber)}
                      className={cx(
                        'mt-1 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                        copied === account.id
                          ? 'border-success/40 bg-success/8'
                          : 'border-line-strong bg-sunken hover:border-ornament',
                      )}
                    >
                      <span className="font-mono text-lg font-semibold tracking-wider tabular-nums text-ink">
                        {account.accountNumber}
                      </span>
                      {copied === account.id ? (
                        <Check className="size-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Copy className="size-4 shrink-0 text-ink-faint" aria-hidden />
                      )}
                      <span className="sr-only">Copy account number</span>
                    </button>

                    {account.note && (
                      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
                        {account.note}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-6"
              icon={Wallet}
              title="Account details coming soon"
              description="The church bank account details will be published here."
            />
          )}
        </section>

        <Rule className="my-12" />

        <section>
          <SectionHeading eyebrow="Ways to give" title="What your giving supports" className="reveal" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <GivingKind
              icon={HandCoins}
              title="Tithe"
              body="The tenth, returned to God in acknowledgement that everything we have comes from Him."
            />
            <GivingKind
              icon={Wallet}
              title="Offering"
              body="Freewill giving at services, supporting the ministry and daily running of the church."
            />
            <GivingKind
              icon={BadgeCheck}
              title="Special funds"
              body="Building projects, missions, welfare and outreach, as announced by the church."
            />
          </div>
        </section>

        <Card className="reveal mt-10 p-5">
          <h2 className="font-display text-lg font-semibold text-ink">After you give</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            If you would like your giving recorded against your name, please send your transfer
            reference to the church office
            {church.phone ? (
              <>
                {' '}
                on{' '}
                <a
                  href={`tel:${church.phone.replace(/\s/g, '')}`}
                  className="font-medium text-info underline underline-offset-2"
                >
                  {church.phone}
                </a>
              </>
            ) : null}
            . The app itself does not collect or store any record of your giving.
          </p>
        </Card>
      </div>
    </>
  )
}

function GivingKind({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Wallet
  title: string
  body: string
}) {
  return (
    <Card className="reveal p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-ornament/12 text-ornament">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-3 font-display text-[1.0625rem] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">{body}</p>
    </Card>
  )
}
