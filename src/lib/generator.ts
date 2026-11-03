export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  numbers: boolean
  symbols: boolean
  avoidAmbiguous: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: true,
}

const AMBIGUOUS = new Set(['O', '0', 'o', 'I', 'l', '1', '|', '`', "'", '"'])
const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
}

function randomInt(max: number) {
  if (max <= 0) return 0
  const limit = Math.floor(0xffffffff / max) * max
  const buffer = new Uint32Array(1)
  do {
    crypto.getRandomValues(buffer)
  } while (buffer[0] >= limit)
  return buffer[0] % max
}

function pick(pool: string) {
  return pool[randomInt(pool.length)]
}

export function generatePassword(options: PasswordOptions) {
  const enabled = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((key) => options[key])
  const filtered = (pool: string) =>
    options.avoidAmbiguous ? [...pool].filter((char) => !AMBIGUOUS.has(char)).join('') : pool
  const pools = enabled.map((key) => filtered(SETS[key])).filter(Boolean)
  if (!pools.length) return ''

  const length = Math.max(options.length, pools.length)
  const chars: string[] = pools.map((pool) => pick(pool))
  const all = pools.join('')
  while (chars.length < length) chars.push(pick(all))

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

const WORDS = `amber anchor apex arrow aspen atlas aurora autumn badge bamboo basil beacon birch
blaze bloom blossom bolt boulder breeze brick bridge bright brook bronze bubble cactus candle
canyon carbon cascade cedar chalk cherry cipher citrus clover cobalt comet copper coral cosmic
cotton cove crimson crystal cypress dawn delta denim desert dew diamond dome drift dune dusk
eagle earth echo ember emerald falcon feather fern field finch fire fjord flame flare flint
fog forest forge fossil frost galaxy garden garnet gecko gem ginger glacier glade glass glow
gold granite grape grove hail harbor hazel heather heron hill honey horizon ice indigo iris
island ivory jade jasper jungle juniper kelp kestrel kite lagoon lake lantern leaf ledge lemon
lilac lily linen lotus lunar lynx maple marble marsh meadow mesa mint mist moon moss mountain
nectar night north nova oak oasis ocean ochre olive onyx opal orbit orchid otter ozone palm
paper peak pearl pebble pepper petal pine planet plum pond poplar prairie prism quartz quill
rain raven reef ridge river robin rocket rose ruby rust saffron sage sand sapphire scarlet sea
shadow shell shore silver sky slate snow solar spark spice spring spruce star steel stone
storm stream summit sun swan sweet swift teal terra thistle thunder tide topaz torch trail
tulip tundra twilight umber valley vapor velvet violet vista walnut wave willow wind winter
wolf wood zephyr zinc`
  .split(/\s+/)
  .filter(Boolean)

export function generatePassphrase(words: number, separator: string, capitalise: boolean) {
  const chosen: string[] = []
  while (chosen.length < words) {
    const word = WORDS[randomInt(WORDS.length)]
    if (!chosen.includes(word)) chosen.push(word)
  }
  return chosen
    .map((word) => (capitalise ? word[0].toUpperCase() + word.slice(1) : word))
    .join(separator)
}

export function passphraseEntropy(words: number) {
  return Math.round(words * Math.log2(WORDS.length))
}

export const WORDLIST_SIZE = WORDS.length
