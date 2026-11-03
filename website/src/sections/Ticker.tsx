const ITEMS = ['Passwords', 'API keys', 'Seed phrases', 'Cards', 'Secure notes', 'TOTP', '.env files', 'Recovery kits']

const ITEMS_2 = ['No cloud', 'No telemetry', 'No account', 'No exceptions', 'No sync server', 'No back door']

export function Ticker() {
  return (
    <section className="ticker" aria-hidden="true">
      <div className="ticker__band ticker__band--acid">
        <div className="ticker__track">
          {[0, 1].map((copy) => (
            <div className="ticker__group" key={copy}>
              {ITEMS.map((item) => (
                <span className="ticker__item" key={`${copy}-${item}`}>
                  {item}
                  <i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="ticker__band ticker__band--ink">
        <div className="ticker__track ticker__track--rev">
          {[0, 1].map((copy) => (
            <div className="ticker__group" key={copy}>
              {ITEMS_2.map((item) => (
                <span className="ticker__item" key={`${copy}-${item}`}>
                  {item}
                  <i>/</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
