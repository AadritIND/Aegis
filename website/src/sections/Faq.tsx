import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionHead } from '../components/ui'

const QUESTIONS = [
  {
    q: 'Where is my vault actually stored?',
    a: 'In one encrypted file inside your operating system’s application-data folder — aegis.vault. There is no server component, no sync account and no telemetry. Copying that file to a USB stick is a complete backup of everything you own.',
  },
  {
    q: 'What happens if I forget the master password?',
    a: 'Nothing can open the vault. The key is derived from your password with scrypt and the file is sealed with AES-256-GCM, so there is no reset link, no recovery phrase and no back door — not for us, not for anyone. The app says this plainly before it lets you in.',
  },
  {
    q: 'Can I sync it between machines?',
    a: 'Yes, manually. Because the file is ciphertext, you can drop it in any cloud drive you already pay for and that provider learns nothing — it only ever sees sealed bytes. Aegis will not merge two divergent copies for you, so treat one machine as the owner and copy deliberately.',
  },
  {
    q: 'Is autofill a browser extension?',
    a: 'Aegis ships its own secure browser window. Logins match by domain and only fill when you explicitly ask, which means no content script sits inside the pages you browse. A companion extension for your everyday browser is on the roadmap, and the comparison page says so.',
  },
  {
    q: 'What can I keep in it besides passwords?',
    a: 'Logins, API keys, payment cards, secure notes and identities. API keys carry their own fields — endpoint, environment, scope — and cards stay masked until you reveal them. TOTP seeds live in the same vault and codes are generated locally.',
  },
  {
    q: 'Has it been audited?',
    a: 'Not by a paid third party. Aegis is a small, deliberately readable Electron app built on Node’s crypto and standard AES-GCM — but “not audited” is the honest answer, and you should weigh it. The security page shows exactly what is stored and what is derived.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. There are no accounts to bill and no servers to pay for, so there is no free tier to be upsold from and no paid tier to move you to. The download page and the app both say free, and that is the whole model.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="faq section" id="faq">
      <div className="container">
        <SectionHead
          eyebrow="09 — Questions"
          title={
            <>
              Questions you
              <br />
              <span className="serif-accent">should</span> ask.
            </>
          }
          copy="The uncomfortable ones first. If a vault cannot answer these plainly, it is hiding something — usually its own business model."
          aside={<span className="mono dim">No marketing answers</span>}
        />

        <div className="faq__list">
          {QUESTIONS.map((item, index) => {
            const isOpen = open === index
            return (
              <div className="faq__item" key={item.q} data-open={isOpen}>
                <button
                  type="button"
                  className="faq__q"
                  id={`faq-q-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="mono faq__n">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.q}</h3>
                  <span className="faq__plus" aria-hidden="true">
                    <Plus size={18} strokeWidth={1.8} />
                  </span>
                </button>
                <div
                  className="faq__panel"
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-q-${index}`}
                >
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="faq__foot" data-reveal>
          <p className="mono">Still unsure? The security model is written in plain English, not a badge wall.</p>
          <a className="btn btn--ghost" href="#security">
            Read the model
          </a>
        </div>
      </div>
    </section>
  )
}
