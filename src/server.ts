import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { z } from "zod";
import { prisma } from "./prisma";

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    const name = `${Date.now()}_${base}${ext.toLowerCase()}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    if (ok) return cb(null, true);
    return cb(new Error("Tipo de archivo no permitido"));
  },
});

const BaseParticipanteSchema = z.object({
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  email: z.string().email(),
  twitter: z.string().min(1),
  ocupacion: z.string().min(1),
});

app.get("/api/listado", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (q) {
      const [nombre, ...resto] = q.split(/\s+/);
      const apellidos = resto.join(" ");

      const result = await prisma.participante.findMany({
        where: {
          OR: [
            { nombre: { contains: q } },
            { apellidos: { contains: q } },
            ...(apellidos
              ? [{
                  AND: [
                    { nombre: { contains: nombre } },
                    { apellidos: { contains: apellidos } },
                  ],
                }]
              : [])
          ]
        },
        orderBy: [{ apellidos: "asc" }, { nombre: "asc" }],
      });
      return res.json(result);
    }

    const result = await prisma.participante.findMany({
      orderBy: [{ apellidos: "asc" }, { nombre: "asc" }],
      take: 200
    });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar" });
  }
});

app.get("/api/participante/:id", async (req, res) => {
  try {
    const item = await prisma.participante.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener" });
  }
});

app.post("/api/registro", upload.single("avatar"), async (req, res) => {
  try {
    const isMultipart = req.is("multipart/form-data");
    const parse = BaseParticipanteSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Datos inválidos", detalles: parse.error.flatten() });
    }

    let avatarUrl: string | undefined;
    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    } else if (typeof (req.body as any).avatar === "string" && (req.body as any).avatar.trim()) {
      avatarUrl = (req.body as any).avatar.trim();
    }

    if (!avatarUrl) {
      return res.status(400).json({ error: "Falta la imagen de avatar" });
    }

    let acepto = false;
    const rawTerminos = (req.body as any).aceptoTerminos;
    if (typeof rawTerminos === "boolean") acepto = rawTerminos;
    if (typeof rawTerminos === "string") acepto = ["on", "true", "1", "sí", "si"].includes(rawTerminos.toLowerCase());
    if (!acepto) {
      return res.status(400).json({ error: "Debe aceptar términos" });
    }

    const data = parse.data;

    const nuevo = await prisma.participante.create({
      data: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        email: data.email,
        twitter: data.twitter,
        ocupacion: data.ocupacion,
        avatar: avatarUrl,
        aceptoTerminos: true,
      },
    });

    res.status(201).json(nuevo);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "El email ya existe" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al crear" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
