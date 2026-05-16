import os
import time
import json
import requests
import psycopg2
import base64
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
HIGGSFIELD_API_KEY = os.getenv('HIGGSFIELD_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
CREATOMATE_API_KEY = os.getenv('CREATOMATE_API_KEY')

def get_db():
    return psycopg2.connect(DATABASE_URL)

def poll_higgsfield(generation_id, max_attempts=24):
    for i in range(max_attempts):
        time.sleep(5)
        try:
            res = requests.get(
                f'https://api.higgsfield.ai/v1/generation/{generation_id}',
                headers={'Authorization': f'Bearer {HIGGSFIELD_API_KEY}'}
            )
            data = res.json()
            status = data.get('status', '')
            print(f'  Higgsfield poll {i+1}: {status}')
            if status in ['completed', 'succeeded', 'success']:
                return data.get('video_url') or data.get('output_url') or data.get('url')
            if status in ['failed', 'error']:
                print(f'  Higgsfield failed: {data}')
                return None
        except Exception as e:
            print(f'  Higgsfield poll error: {e}')
    return None

def generate_higgsfield_scene(prompt, duration, brand_color):
    try:
        res = requests.post(
            'https://api.higgsfield.ai/v1/generation/text-to-video',
            headers={
                'Authorization': f'Bearer {HIGGSFIELD_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'prompt': f'{prompt} Brand color accent: {brand_color}. Cinematic 9:16 vertical format.',
                'duration': min(int(duration), 8),
                'aspect_ratio': '9:16'
            }
        )
        data = res.json()
        print(f'  Higgsfield started: {data}')
        generation_id = data.get('id') or data.get('generation_id')
        if generation_id:
            return poll_higgsfield(generation_id)
        return None
    except Exception as e:
        print(f'  Higgsfield error: {e}')
        return None

def generate_elevenlabs_voiceover(text):
    if not ELEVENLABS_API_KEY or not text:
        return None
    try:
        res = requests.post(
            'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
            headers={
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            json={
                'text': text,
                'model_id': 'eleven_monolingual_v1',
                'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}
            }
        )
        if res.status_code == 200:
            audio_b64 = base64.b64encode(res.content).decode('utf-8')
            return f'data:audio/mpeg;base64,{audio_b64}'
        print(f'  ElevenLabs error: {res.status_code} {res.text}')
        return None
    except Exception as e:
        print(f'  ElevenLabs error: {e}')
        return None

def build_creatomate_timeline(scenes_data, brand_name, brand_color):
    elements = []
    time_offset = 0

    for scene in scenes_data:
        duration = scene.get('duration', 5)

        if scene.get('higgsfield_url'):
            elements.append({
                'type': 'video',
                'source': scene['higgsfield_url'],
                'time': time_offset,
                'duration': duration,
                'fit': 'cover',
                'volume': '0%'
            })
        else:
            elements.append({
                'type': 'rectangle',
                'width': '100%',
                'height': '100%',
                'fill_color': '#0B0B0D',
                'time': time_offset,
                'duration': duration
            })

        elements.append({
            'type': 'rectangle',
            'width': '100%',
            'height': '100%',
            'fill_color': 'rgba(0,0,0,0.5)',
            'time': time_offset,
            'duration': duration
        })

        if scene.get('text_overlay'):
            elements.append({
                'type': 'text',
                'text': scene['text_overlay'],
                'time': time_offset + 0.3,
                'duration': duration - 0.5,
                'width': '85%',
                'height': 'auto',
                'x_alignment': '50%',
                'y_alignment': '50%',
                'font_family': 'Montserrat',
                'font_weight': '800',
                'font_size': '8.5 vmin',
                'fill_color': '#FFFFFF',
                'animations': [{'type': 'text-slide', 'duration': 0.4, 'direction': 'up', 'scope': 'split-clip'}]
            })

        if scene.get('audio_url'):
            elements.append({
                'type': 'audio',
                'source': scene['audio_url'],
                'time': time_offset,
                'duration': duration
            })

        time_offset += duration

    elements.append({
        'type': 'text',
        'text': brand_name,
        'time': 0,
        'duration': time_offset,
        'x_alignment': '95%',
        'y_alignment': '94%',
        'font_family': 'Montserrat',
        'font_weight': '300',
        'font_size': '3 vmin',
        'fill_color': 'rgba(255,255,255,0.5)'
    })

    elements.append({
        'type': 'audio',
        'source': 'https://cdn.pixabay.com/audio/2023/10/09/audio_5bafbf7b60.mp3',
        'time': 0,
        'duration': time_offset,
        'volume': '15%',
        'audio_fade_in': 1,
        'audio_fade_out': 1
    })

    return elements, time_offset

def produce_with_creatomate(elements, total_duration):
    try:
        res = requests.post(
            'https://api.creatomate.com/v1/renders',
            headers={
                'Authorization': f'Bearer {CREATOMATE_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'output_format': 'mp4',
                'width': 1080,
                'height': 1920,
                'frame_rate': 30,
                'duration': total_duration,
                'elements': elements
            }
        )
        data = res.json()
        print(f'  Creatomate started: {data}')
        render_id = data[0].get('id') if isinstance(data, list) else data.get('id')
        if not render_id:
            return None

        for i in range(30):
            time.sleep(5)
            poll = requests.get(
                f'https://api.creatomate.com/v1/renders/{render_id}',
                headers={'Authorization': f'Bearer {CREATOMATE_API_KEY}'}
            )
            poll_data = poll.json()
            status = poll_data.get('status')
            print(f'  Creatomate poll {i+1}: {status}')
            if status == 'succeeded':
                return poll_data.get('url')
            if status == 'failed':
                print(f'  Creatomate failed: {poll_data}')
                return None
        return None
    except Exception as e:
        print(f'  Creatomate error: {e}')
        return None

def process_package(package):
    package_id = package[0]
    brand_id = package[1]
    script_raw = package[2]

    print(f'\nProcessing package {package_id}')

    try:
        script = json.loads(script_raw) if script_raw else None
    except:
        script = None

    if not script or not script.get('scenes'):
        print('  No scenes found in script — skipping')
        update_package_status(package_id, 'needs_visual')
        return

    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT name, primary_color, logo_url FROM brands WHERE id = %s', (brand_id,))
    brand = cur.fetchone()
    cur.close()
    conn.close()

    brand_name = brand[0] if brand else 'Brand'
    brand_color = brand[1] if brand else '#C2B59B'

    scenes = script['scenes']
    scenes_data = []

    for scene in scenes:
        print(f'  Processing scene {scene.get("scene_number", "?")}')
        scene_data = dict(scene)

        if scene.get('visual_prompt') and HIGGSFIELD_API_KEY:
            print(f'  Generating Higgsfield visual...')
            video_url = generate_higgsfield_scene(scene['visual_prompt'], scene.get('duration', 5), brand_color)
            scene_data['higgsfield_url'] = video_url
            if video_url:
                print(f'  Higgsfield done: {video_url[:50]}...')
        else:
            scene_data['higgsfield_url'] = None

        if scene.get('voiceover') and ELEVENLABS_API_KEY:
            print(f'  Generating voiceover...')
            audio_url = generate_elevenlabs_voiceover(scene['voiceover'])
            scene_data['audio_url'] = audio_url
            if audio_url:
                print(f'  Voiceover done')
        else:
            scene_data['audio_url'] = None

        scenes_data.append(scene_data)

    print('  Building Creatomate timeline...')
    elements, total_duration = build_creatomate_timeline(scenes_data, brand_name, brand_color)

    print('  Submitting to Creatomate...')
    final_url = produce_with_creatomate(elements, total_duration)

    if not final_url:
        best_scene = next((s for s in scenes_data if s.get('higgsfield_url')), None)
        if best_scene:
            final_url = best_scene['higgsfield_url']
            print(f'  Creatomate failed — using best Higgsfield scene as fallback')
        else:
            print('  No visual available — marking needs_visual')
            update_package_status(package_id, 'needs_visual')
            return

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE post_packages SET visual_url=%s, visual_type='video', status='ready', scenes_count=%s, video_duration=%s WHERE id=%s",
        (final_url, len(scenes_data), int(total_duration), package_id)
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f'  Package {package_id} complete!')
    print(f'  Video URL: {final_url}')

def update_package_status(package_id, status):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("UPDATE post_packages SET status=%s WHERE id=%s", (status, package_id))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f'DB update error: {e}')

def main():
    print('Hermes Video Worker starting...')
    print(f'Database: {DATABASE_URL[:30]}...' if DATABASE_URL else 'No DATABASE_URL!')
    print(f'Higgsfield: {"connected" if HIGGSFIELD_API_KEY else "missing"}')
    print(f'ElevenLabs: {"connected" if ELEVENLABS_API_KEY else "missing"}')
    print(f'Creatomate: {"connected" if CREATOMATE_API_KEY else "missing"}')
    print('Polling every 60 seconds...\n')

    while True:
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "SELECT id, brand_id, script FROM post_packages WHERE status='producing' ORDER BY created_at ASC LIMIT 1"
            )
            package = cur.fetchone()
            cur.close()
            conn.close()

            if package:
                process_package(package)
            else:
                print(f'[{datetime.now().strftime("%H:%M:%S")}] No packages in queue — waiting...')

        except Exception as e:
            print(f'Worker error: {e}')

        time.sleep(60)

if __name__ == '__main__':
    main()
