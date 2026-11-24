const PREFIX = "data:image/jpeg;base64,";
const MAX = 180_000;

export function keepPhoto(value: unknown) {
  if (typeof value !== "string" || !value.startsWith(PREFIX) || value.length > MAX) return "";
  const body = value.slice(PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return "";
  return value;
}

export async function compressPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choisissez une photo.");
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 960 / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("La photo n’a pas pu être préparée.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.72;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 150_000 && quality > 0.42) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (!keepPhoto(data)) throw new Error("La photo reste trop lourde. Rapprochez-vous du véhicule.");
  return data;
}
