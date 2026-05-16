# Hermes Video Worker

Local video production worker for Lithos Labs AI Marketing OS.
Runs on your Mac. No Vercel timeouts. Produces complete multi-scene videos.

## Setup

1. Open terminal and navigate here:
   cd /Users/eug_fx/Documents/Orvex\ Systems/prospector/hermes-worker

2. Install dependencies:
   pip install -r requirements.txt --break-system-packages

3. Copy env file:
   cp .env.example .env

4. Fill in your API keys in .env:
   - DATABASE_URL: your Neon database URL from neon.tech dashboard
   - HIGGSFIELD_API_KEY: from cloud.higgsfield.ai
   - ELEVENLABS_API_KEY: from elevenlabs.io
   - CREATOMATE_API_KEY: already filled in

5. Run the worker:
   python video_worker.py

## How it works

- Polls your database every 60 seconds
- Finds packages with status=producing
- Generates Higgsfield cinematic footage per scene
- Generates ElevenLabs voiceover per scene
- Assembles everything in Creatomate
- Updates database when complete
- Your app shows the finished video automatically

## Keep it running

To run in background:
nohup python video_worker.py > worker.log 2>&1 &

To stop:
pkill -f video_worker.py

To see logs:
tail -f worker.log
