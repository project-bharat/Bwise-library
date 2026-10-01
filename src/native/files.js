import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './storage';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Native: write to cache + open Android share sheet (Save to Drive / WhatsApp / Files...). Web: normal download. */
export async function saveAndShareBlob(blob, fileName, dialogTitle) {
  if (!isNative()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
    return;
  }
  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache, recursive: true });
  await Share.share({ title: fileName, dialogTitle: dialogTitle || 'Share', files: [written.uri] });
}

export const isShareCancel = (err) => /cancel/i.test(String((err && err.message) || err));
