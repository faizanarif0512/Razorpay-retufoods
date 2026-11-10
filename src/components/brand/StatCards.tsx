import { Card } from './ui';

const stats = [
  {
    tag: '01 · Cell Census',
    value: '1.3',
    unit: ': 1',
    label: 'microbial cells to human cells living in and on the body',
    colour: 'text-brand-pink',
    tint: 'bg-[#FFF1F4]',
    bars: [
      { name: 'microbial (~38 trillion)', pct: 56, colour: 'bg-brand-pink' },
      { name: 'human (~30 trillion)', pct: 44, colour: 'bg-[#F7A8B8]' },
    ],
    note: 'Corrected in 2016 from the old "10:1" claim, which traced to a 1970s estimate. The measured ratio sits near 1.3:1 — close enough that a single bowel movement can briefly tip it.',
  },
  {
    tag: '02 · Genetic Payload',
    value: '10',
    unit: 'million+',
    label: 'microbial genes catalogued across human guts, against our own ~20,000',
    colour: 'text-brand-mango',
    tint: 'bg-[#FFF8EC]',
    bars: [
      { name: 'microbial 10M+', pct: 99.8, colour: 'bg-brand-mango' },
      { name: 'human ~20k', pct: 0.6, colour: 'bg-[#F8D48F]' },
    ],
    caption: '↑ drawn to scale — human genes are ~0.2% of the bar, which is rather the point.',
    note: "The 10M+ figure is a non-redundant catalogue drawn across many people's microbiomes. Any single person carries a few hundred thousand to a couple million microbial genes — still a substantial multiple of our own.",
  },
  {
    tag: '03 · Serotonin',
    value: '90',
    unit: '%',
    label: "of the body's serotonin is produced in the gut",
    colour: 'text-brand-purple',
    tint: 'bg-[#F6F0FB]',
    detail:
      'Accurate — but this serotonin largely stays in the gut, where it supports motility. It does not cross into the brain. The gut–brain link runs through other channels: the vagus nerve, immune signals, and microbial metabolites.',
    note: 'The most-misread stat of the four. It supports a gut–brain signalling story — not the idea that the gut brews your mood and ships it upstairs.',
  },
  {
    tag: '04 · Immune Tissue',
    value: '70',
    unit: '%',
    label: "of the body's immune tissue is housed in the gut",
    colour: 'text-brand-mango',
    tint: 'bg-[#FFF8EC]',
    detail:
      'Reasonably supported by the gut-associated lymphoid tissue (GALT), but the exact figure has a fuzzy origin. Read the dashed line as "most," not a precise measurement.',
    note: 'The softest of the set. Widely repeated, loosely sourced — good as a directional claim, shaky as a precise one.',
  },
];

// The four "why the gut dictates everything" figures shared by Home and The Microbiome
export default function StatCards({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <>
      {showIntro && (
        <>
          <p className="mx-auto mt-8 max-w-4xl text-left text-[15px] leading-relaxed">
            By the numbers, you are at least as much microbe as human. The cells in and on your body are split almost evenly
            between microbial and human — close to a one-to-one ratio, not the ten-to-one figure you may have read, which the
            science corrected in 2016. But look at genes rather than cells and it isn’t close at all: your microbes carry more
            than ten million genes, against roughly twenty thousand of your own. By that measure you are overwhelmingly more
            microbial than human. This community, most of it living in your gut, does work your body cannot do alone. When it’s
            healthy, you rarely notice it. When it isn’t, you notice almost everything.
          </p>
          <p className="mx-auto mt-6 max-w-4xl text-sm font-semibold">
            <span className="text-brand-pink">~1.3 : 1</span> microbial to human cells ·{' '}
            <span className="text-brand-pink">10M+</span> microbial genes (vs ~20,000 human) ·{' '}
            <span className="text-brand-pink">~90%</span> of the body’s serotonin made in the gut ·{' '}
            <span className="text-brand-pink">~70%</span> of immune tissue in the gut
          </p>
        </>
      )}
      <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
        {stats.map((s) => (
          <Card key={s.tag} className={`${s.tint} border border-white p-8`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${s.colour}`}>{s.tag}</p>
            <p className={`mt-4 font-button font-bold leading-none ${s.colour}`}>
              <span className="text-6xl sm:text-7xl">{s.value}</span>
              <span className="ml-1 text-2xl">{s.unit}</span>
            </p>
            <p className="mt-5 font-button text-2xl font-bold leading-tight">{s.label}</p>
            {s.bars && (
              <div className="mt-6 space-y-2">
                <div className="flex h-3 overflow-hidden rounded-full bg-white">
                  {s.bars.map((b) => (
                    <div key={b.name} className={b.colour} style={{ width: `${b.pct}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  {s.bars.map((b) => (
                    <span key={b.name} className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${b.colour}`} />
                      {b.name}
                    </span>
                  ))}
                </div>
                {s.caption && <p className="text-xs text-neutral-600">{s.caption}</p>}
              </div>
            )}
            {s.detail && <p className="mt-6 text-sm leading-relaxed">{s.detail}</p>}
            <p className={`mt-6 text-[11px] font-bold uppercase tracking-[0.12em] ${s.colour}`}>The Fine Print</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">{s.note}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
