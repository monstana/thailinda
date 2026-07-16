import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { itemById } from '$lib/data/learning.js';

const TYPHOON_TRANSCRIPTION_URL = 'https://api.opentyphoon.ai/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/opus', 'audio/flac']);

function normalizeThai(value) {
  return String(value || '').normalize('NFC').toLowerCase().replace(/[^\p{Script=Thai}\p{Letter}\p{Number}]/gu, '');
}

function acceptedAnswers(item) {
  const answers = item.category === 'words'
    ? [item.display, `คำว่า${item.display}`]
    : item.category === 'vowels'
      ? [item.sound, item.audioText, item.name, item.example]
      : [item.sound, item.name];
  return new Set(answers.map(normalizeThai).filter(Boolean));
}

function errorResponse(message, status = 500) {
  return json({ error: message }, { status });
}

export async function POST({ request, fetch }) {
  if (!env.TYPHOON_API_KEY) return errorResponse('ระบบประเมินเสียงยังไม่ได้ตั้งค่า API key', 503);

  const form = await request.formData();
  const targetId = String(form.get('targetId') || '');
  const audio = form.get('audio');
  const target = itemById[targetId];

  if (!target) return errorResponse('ไม่พบคำเป้าหมายสำหรับประเมิน', 400);
  if (!(audio instanceof File) || audio.size === 0) return errorResponse('ไม่พบไฟล์เสียงสำหรับประเมิน', 400);
  if (audio.size > MAX_AUDIO_BYTES) return errorResponse('ไฟล์เสียงยาวเกินไป กรุณาพูดใหม่ให้สั้นลง', 413);
  if (audio.type && !ALLOWED_AUDIO_TYPES.has(audio.type)) return errorResponse('รูปแบบไฟล์เสียงไม่รองรับ', 415);

  const upstreamForm = new FormData();
  const upstreamAudio = audio.type === 'audio/mpeg'
    ? new File([audio], audio.name || 'speech.mp3', { type: 'audio/mp3' })
    : audio;
  upstreamForm.append('model', 'typhoon-asr-realtime');
  upstreamForm.append('file', upstreamAudio, upstreamAudio.name || 'speech.wav');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(TYPHOON_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TYPHOON_API_KEY}` },
      body: upstreamForm,
      signal: controller.signal
    });

    if (!response.ok) {
      return errorResponse(response.status === 401 || response.status === 403
        ? 'API key สำหรับประเมินเสียงไม่ถูกต้องหรือไม่มีสิทธิ์ใช้งาน'
        : 'บริการประเมินเสียงไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง', 502);
    }

    const result = await response.json();
    const transcript = String(result?.text || '').trim();
    const normalizedTranscript = normalizeThai(transcript);
    const passed = Boolean(normalizedTranscript && acceptedAnswers(target).has(normalizedTranscript));

    return json({
      passed,
      transcript,
      targetId: target.id,
      mode: 'typhoon-asr'
    });
  } catch (error) {
    return errorResponse(error?.name === 'AbortError'
      ? 'การประเมินเสียงใช้เวลานานเกินไป กรุณาลองใหม่'
      : 'เชื่อมต่อบริการประเมินเสียงไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่', 502);
  } finally {
    clearTimeout(timeout);
  }
}
