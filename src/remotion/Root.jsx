import { Composition } from 'remotion'
import { HookOpener } from './compositions/HookOpener'
import { TradeInsight } from './compositions/TradeInsight'
import { QuoteCard } from './compositions/QuoteCard'

export const RemotionRoot = () => (
  <>
    <Composition
      id="HookOpener"
      component={HookOpener}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        headline: 'Discipline is built quietly.',
        subtext: 'Most people quit too early.',
        brandColor: '#ffffff',
      }}
    />
    <Composition
      id="TradeInsight"
      component={TradeInsight}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        title: 'The ICT Concept Nobody Talks About',
        points: ['Point 1', 'Point 2', 'Point 3'],
        brandColor: '#ffffff',
      }}
    />
    <Composition
      id="QuoteCard"
      component={QuoteCard}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        quote: 'Silence reveals character.',
        author: 'LIMITLESS',
        brandColor: '#ffffff',
      }}
    />
  </>
)
