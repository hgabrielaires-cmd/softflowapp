import { Mp3Encoder } from "@breezystack/lamejs";

/** Converte qualquer áudio gravado pelo navegador em MP3 mono (aceito pela API oficial do WhatsApp). */
export async function converterAudioParaMp3(file: File): Promise<File> {
  const buf = await file.arrayBuffer();
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const audio: AudioBuffer = await ctx.decodeAudioData(buf);
  ctx.close?.();

  const sampleRate = audio.sampleRate;
  const canais = audio.numberOfChannels;
  const len = audio.length;
  const mono = new Int16Array(len);
  const dados = Array.from({ length: canais }, (_, c) => audio.getChannelData(c));
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let c = 0; c < canais; c++) s += dados[c][i];
    s = Math.max(-1, Math.min(1, s / canais));
    mono[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const enc = new Mp3Encoder(1, sampleRate, 64);
  const partes: Uint8Array[] = [];
  const bloco = 1152;
  for (let i = 0; i < len; i += bloco) {
    const out = enc.encodeBuffer(mono.subarray(i, i + bloco));
    if (out.length) partes.push(new Uint8Array(out));
  }
  const fim = enc.flush();
  if (fim.length) partes.push(new Uint8Array(fim));

  const nome = file.name.replace(/\.[^.]+$/, "") + ".mp3";
  return new File(partes as BlobPart[], nome, { type: "audio/mpeg" });
}
