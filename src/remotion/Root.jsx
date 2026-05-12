import { registerRoot } from 'remotion'
import { Composition } from 'remotion'
import { HookOpener } from './compositions/HookOpener'
import { TradeInsight } from './compositions/TradeInsight'
import { QuoteCard } from './compositions/QuoteCard'
import { BrandPromo } from './compositions/BrandPromo'
import { ServiceAd } from './compositions/ServiceAd'

export const RemotionRoot = () => (
  <>
    <Composition id="HookOpener" component={HookOpener} durationInFrames={270} fps={30} width={1080} height={1920}
      defaultProps={{ headline: 'Discipline is built quietly.', subtext: 'Most people quit too early.', brandName: 'LIMITLESS', primaryColor: '#c084fc', secondaryColor: '#ffffff', logoUrl: null }} />
    <Composition id="TradeInsight" component={TradeInsight} durationInFrames={360} fps={30} width={1080} height={1920}
      defaultProps={{ title: 'The habit that separates winning traders', points: ['Journal every trade', 'Review every week', 'Improve every month'], brandName: 'LIMITLESS', primaryColor: '#c084fc', secondaryColor: '#ffffff', logoUrl: null, ctaText: 'Start journaling today' }} />
    <Composition id="QuoteCard" component={QuoteCard} durationInFrames={180} fps={30} width={1080} height={1920}
      defaultProps={{ quote: 'Silence reveals character.', author: 'LIMITLESS', brandName: 'LIMITLESS', primaryColor: '#c084fc', secondaryColor: '#ffffff', logoUrl: null }} />
    <Composition id="BrandPromo" component={BrandPromo} durationInFrames={450} fps={30} width={1080} height={1920}
      defaultProps={{ headline: 'The smarter way to trade', features: ['Track every trade', 'Spot your patterns', 'Improve your edge'], brandName: 'LIMITLESS', primaryColor: '#c084fc', secondaryColor: '#ffffff', logoUrl: null, ctaText: 'Start free today' }} />
    <Composition id="ServiceAd" component={ServiceAd} durationInFrames={300} fps={30} width={1080} height={1920}
      defaultProps={{ problem: 'Hidden leaks are costing you money', solution: 'Professional leak detection in Aruba', serviceName: 'Leak Inspection', price: 'Afl. 175', brandName: 'AWATEC', primaryColor: '#4ade80', secondaryColor: '#ffffff', logoUrl: null, ctaText: 'Call us today' }} />
  </>
)

registerRoot(RemotionRoot)
