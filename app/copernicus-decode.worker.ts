import { parentPort, threadId } from 'node:worker_threads';
import { decodeCopernicusBlock } from './copernicus-terrain-server.ts';

parentPort?.on('message', (message: { id: number; bytes: Uint8Array }) => {
  try {
    if (!Number.isSafeInteger(message.id) || !(message.bytes instanceof Uint8Array)
      || message.bytes.byteLength < 1 || message.bytes.byteLength > 5 * 1024 * 1024) throw Error('Invalid terrain decode request');
    const values = decodeCopernicusBlock(Buffer.from(message.bytes));
    parentPort!.postMessage({ id: message.id, values, threadId }, [values.buffer]);
  } catch { parentPort!.postMessage({ id: message.id, error: 'Terrain block decode failed', threadId }); }
});
