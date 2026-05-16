// Shared Remotion render kickoff. Underscore-prefixed so Vercel does NOT
// treat this as a Serverless Function (keeps us under the 12-function cap).
import { renderMediaOnLambda } from '@remotion/lambda-client'

export async function startRemotionRender({ compositionId, props, brandId, sql }) {
  if (!process.env.REMOTION_FUNCTION_NAME || !process.env.REMOTION_SERVE_URL) {
    console.log('Remotion not configured — skipping render')
    return null
  }

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.REMOTION_AWS_REGION || 'us-east-1',
      functionName: process.env.REMOTION_FUNCTION_NAME,
      serveUrl: process.env.REMOTION_SERVE_URL,
      composition: compositionId,
      inputProps: props,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      framesPerLambda: 40,
      concurrencyPerLambda: 1,
      privacy: 'public',
    })

    console.log('Render started:', renderId, 'bucket:', bucketName)
    return { renderId, bucketName }
  } catch (err) {
    console.error('Remotion render failed:', err.message)
    return null
  }
}
