import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { connection } from "next/server";

export async function POST(request: Request) {
  await connection();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choisissez une image." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Seules les images sont acceptées." }, { status: 400 });
  }
  if (file.size > 4_000_000) {
    return Response.json({ error: "Image trop lourde : 4 Mo maximum." }, { status: 400 });
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/${name}` });
}
