import { Composition } from 'remotion'
import { HookOpener } from './compositions/HookOpener'
import { TradeInsight } from './compositions/TradeInsight'
import { QuoteCard } from './compositions/QuoteCard'
import { BrandPromo } from './compositions/BrandPromo'
import { ServiceAd } from './compositions/ServiceAd'

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
        brandName: 'LIMITLESS',
        primaryColor: '#ffffff',
        logoUrl: null,
      }}
    />
    <Composition
      id="TradeInsight"
      component={TradeInsight}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        title: 'The ICT Concept Nobody Talks About',
        points: ['Liquidity grabs', 'Order blocks', 'Fair value gaps'],
        brandColor: '#ffffff',
        brandName: 'LIMITLESS',
        primaryColor: '#ffffff',
        logoUrl: null,
        ctaText: 'Start journaling your trades',
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
        brandName: 'LIMITLESS',
        primaryColor: '#ffffff',
        logoUrl: null,
      }}
    />
    <Composition
      id="BrandPromo"
      component={BrandPromo}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        logoUrl: null,
        brandName: 'LIMITLESS',
        primaryColor: '#ffffff',
        secondaryColor: '#a78bfa',
        headline: 'The smarter way to trade',
        features: [
          'Track every trade',
          'Spot your patterns',
          'Improve your edge',
        ],
        ctaText: 'Start free today',
      }}
    />
    <Composition
      id="ServiceAd"
      component={ServiceAd}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        logoUrl: null,
        brandName: 'AWATEC',
        primaryColor: '#4ade80',
        secondaryColor: '#ffffff',
        problem: 'Hidden leaks are costing you money',
        solution: 'Professional leak detection in Aruba',
        serviceName: 'Leak Inspection',
        price: 'Afl. 150',
        ctaText: 'Call us today',
      }}
    />
  </>
)
