from __future__ import annotations

import math
import os
import textwrap
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "exports"
OUT_FILE = OUT_DIR / "althera_video_explicativo.mp4"

W, H = 1280, 720
FPS = 24
DURATION = 74
TOTAL_FRAMES = FPS * DURATION

BG = np.array([2, 2, 7], dtype=np.float32)
VIOLET = (139, 92, 246)
FUCHSIA = (217, 70, 239)
ROSE = (244, 63, 94)
CYAN = (34, 211, 238)
WHITE = (245, 247, 255)
SLATE = (148, 163, 184)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


F = {
    "hero": font(70, True),
    "h1": font(52, True),
    "h2": font(34, True),
    "body": font(28),
    "small": font(21),
    "mono": font(18, True),
    "micro": font(15, True),
}


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1 - pow(1 - x, 3)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def glow(base: Image.Image, xy, radius, color, alpha=120):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(radius // 2))
    base.alpha_composite(layer)


def background(t: float) -> Image.Image:
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    pulse = 0.5 + 0.5 * math.sin(t * 0.45)
    arr = np.zeros((H, W, 3), dtype=np.float32) + BG
    arr += np.dstack([
        28 * np.exp(-((x - 0.15 - 0.06 * math.sin(t * .2)) ** 2 + (y - .82) ** 2) / .08),
        9 * np.exp(-((x - .8) ** 2 + (y - .2) ** 2) / .05),
        42 * np.exp(-((x - .76) ** 2 + (y - .28 - .05 * pulse) ** 2) / .07),
    ])
    img = Image.fromarray(np.uint8(np.clip(arr, 0, 255))).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for gx in range(0, W, 56):
        d.line((gx, 0, gx, H), fill=(139, 92, 246, 18))
    for gy in range(0, H, 56):
        d.line((0, gy, W, gy), fill=(139, 92, 246, 16))
    for i in range(8):
        r = 90 + i * 45 + 10 * math.sin(t + i)
        d.ellipse((920 - r, 150 - r, 920 + r, 150 + r), outline=(168, 85, 247, 34 - i * 3), width=2)
    return img


def text(draw, xy, value, fnt, fill=WHITE, anchor=None, spacing=7):
    draw.multiline_text(xy, value, font=fnt, fill=fill, anchor=anchor, spacing=spacing)


def fit_lines(value: str, chars: int = 48) -> str:
    return "\n".join(textwrap.wrap(value, width=chars))


def badge(d, x, y, label, color=VIOLET):
    rounded(d, (x, y, x + 300, y + 42), 21, (255, 255, 255, 15), (*color, 70), 1)
    d.ellipse((x + 17, y + 15, x + 29, y + 27), fill=(*color, 255))
    d.text((x + 42, y + 12), label.upper(), font=F["micro"], fill=(225, 230, 255))


def draw_phone(d, x, y, scale=1.0):
    w, h = int(210 * scale), int(390 * scale)
    rounded(d, (x, y, x + w, y + h), int(34 * scale), (4, 5, 12, 245), (255, 255, 255, 45), 3)
    rounded(d, (x + 14, y + 18, x + w - 14, y + h - 18), int(26 * scale), (12, 11, 22, 255), None, 1)
    rounded(d, (x + 70, y + 22, x + 140, y + 34), 7, (0, 0, 0, 255))
    d.text((x + 36, y + 66), "KAPSELY", font=F["mono"], fill=WHITE)
    d.text((x + 36, y + 98), "The future\nof sharing", font=F["small"], fill=(210, 200, 255), spacing=3)
    for i, c in enumerate([VIOLET, FUCHSIA, CYAN]):
        d.rounded_rectangle((x + 36, y + 170 + i * 52, x + w - 36, y + 205 + i * 52), 12, fill=(*c, 42), outline=(*c, 100))


def draw_dashboard(d, x, y, w, h, progress):
    rounded(d, (x, y, x + w, y + h), 22, (5, 7, 16, 235), (255, 255, 255, 42), 2)
    d.text((x + 28, y + 24), "Panel Althera", font=F["small"], fill=WHITE)
    labels = [("Proyectos", ROSE, 0.82), ("Ingresos", CYAN, 0.72), ("Clientes", VIOLET, 0.9)]
    for i, (name, col, val) in enumerate(labels):
        yy = y + 82 + i * 72
        d.text((x + 28, yy), name, font=F["micro"], fill=SLATE)
        rounded(d, (x + 150, yy + 5, x + w - 30, yy + 21), 8, (255, 255, 255, 18))
        rounded(d, (x + 150, yy + 5, x + 150 + int((w - 180) * val * progress), yy + 21), 8, (*col, 220))
    for i in range(9):
        bx = x + 40 + i * 48
        bh = int((42 + 90 * abs(math.sin(i * .9 + progress * 2))) * progress)
        d.rounded_rectangle((bx, y + h - 45 - bh, bx + 25, y + h - 45), 6, fill=(*mix(VIOLET, ROSE, i / 8), 210))


def scene(frame: int) -> Image.Image:
    t = frame / FPS
    img = background(t)
    d = ImageDraw.Draw(img, "RGBA")

    scenes = [
        (0, 8, "intro"), (8, 19, "what"), (19, 31, "services"),
        (31, 43, "process"), (43, 56, "growth"), (56, 68, "future"), (68, 74, "end")
    ]
    name, local, dur = "intro", t, 8
    for start, end, n in scenes:
        if start <= t < end:
            name, local, dur = n, t - start, end - start
            break
    p = ease(local / dur)

    if name == "intro":
        glow(img, (650, 350), int(260 + 40 * math.sin(t)), VIOLET, 110)
        d.text((88, 86), "ALTHERA", font=F["hero"], fill=WHITE)
        d.text((92, 160), "solutions", font=F["h2"], fill=FUCHSIA)
        text(d, (92, 250), "Tecnologia de alta costura para negocios que quieren crecer con software propio.", F["body"], SLATE)
        badge(d, 92, 360, "Desarrollo digital premium", VIOLET)
        draw_dashboard(d, 760, 250, 390, 280, p)

    elif name == "what":
        d.text((78, 70), "Que es Althera", font=F["h1"], fill=WHITE)
        body = ("Somos una boutique de desarrollo tecnologico. Disenamos y programamos plataformas SaaS, "
                "webs corporativas, paneles internos, automatizaciones, sistemas de clientes y experiencias digitales "
                "con rendimiento, estetica y estructura empresarial.")
        text(d, (82, 155), fit_lines(body, 58), F["body"], SLATE)
        cards = [("Codigo limpio", "React, TypeScript, Node"), ("Cloud y datos", "Supabase, PostgreSQL, RLS"), ("Producto visual", "UX, motion, conversion")]
        for i, (a, b) in enumerate(cards):
            x = 86 + i * 380
            rounded(d, (x, 470, x + 330, 610), 18, (255, 255, 255, 18), (*mix(VIOLET, ROSE, i / 2), 95), 2)
            d.text((x + 24, 505), a, font=F["h2"], fill=WHITE)
            d.text((x + 24, 555), b, font=F["small"], fill=SLATE)

    elif name == "services":
        d.text((78, 70), "Que hacemos", font=F["h1"], fill=WHITE)
        items = [
            "Plataformas SaaS y herramientas internas para operar mejor.",
            "Webs premium, e-commerce y portfolios orientados a conversion.",
            "CRM, calendarios, finanzas, contratos y paneles de equipo.",
            "Gestion de redes: contenido, plan editorial, campanas y metricas.",
            "Integraciones con pagos, bases de datos, APIs y automatizaciones.",
        ]
        for i, item in enumerate(items):
            y = 162 + i * 82
            d.ellipse((90, y + 9, 122, y + 41), fill=(*mix(VIOLET, CYAN, i / 4), 230))
            d.text((140, y), item, font=F["body"], fill=(230, 235, 250))
        draw_phone(d, 920, 170, 0.92)

    elif name == "process":
        d.text((78, 70), "Como trabajamos", font=F["h1"], fill=WHITE)
        steps = [("1", "Diagnostico", "Entendemos objetivos, publico, procesos y prioridades reales."),
                 ("2", "Diseno", "Convertimos la idea en flujos, pantallas y arquitectura clara."),
                 ("3", "Construccion", "Desarrollamos por modulos, con entregas visibles y medibles."),
                 ("4", "Lanzamiento", "Probamos, desplegamos, medimos y seguimos mejorando.")]
        for i, (num, title, desc) in enumerate(steps):
            x = 80 + i * 300
            rounded(d, (x, 220, x + 250, 510), 18, (255, 255, 255, 16), (*mix(VIOLET, ROSE, i / 3), 90), 2)
            d.text((x + 22, 245), num, font=F["hero"], fill=mix(VIOLET, ROSE, i / 3))
            d.text((x + 24, 345), title, font=F["h2"], fill=WHITE)
            text(d, (x + 24, 395), fit_lines(desc, 24), F["small"], SLATE, spacing=5)
            if i < 3:
                d.line((x + 250, 365, x + 296, 365), fill=(*FUCHSIA, 120), width=4)

    elif name == "growth":
        d.text((78, 70), "Objetivo de este ano", font=F["h1"], fill=WHITE)
        text(d, (82, 145), fit_lines("Aumentar la cantidad de personas con las que trabajamos, elevar ingresos y multiplicar los proyectos que llevamos a cabo.", 58), F["body"], SLATE)
        metrics = [("Mas equipo", "personas", VIOLET, 0.85), ("Mas ingresos", "facturacion", CYAN, 0.78), ("Mas proyectos", "entregas", ROSE, 0.95)]
        for i, (title, sub, col, val) in enumerate(metrics):
            x = 115 + i * 360
            rounded(d, (x, 325, x + 285, 565), 20, (255, 255, 255, 18), (*col, 100), 2)
            d.text((x + 28, 360), title, font=F["h2"], fill=WHITE)
            d.text((x + 28, 405), sub.upper(), font=F["mono"], fill=SLATE)
            d.arc((x + 64, 440, x + 220, 596), 180, int(180 + 330 * val * p), fill=(*col, 255), width=14)
            d.text((x + 98, 495), f"+{int(val * 100 * p)}%", font=F["h2"], fill=col)

    elif name == "future":
        d.text((78, 70), "Proximos pasos", font=F["h1"], fill=WHITE)
        bullets = [
            "Captar mejores oportunidades comerciales y convertirlas en relaciones a largo plazo.",
            "Ampliar el equipo con perfiles de desarrollo, diseno, ventas y gestion de proyectos.",
            "Crear procesos repetibles para entregar mas rapido sin perder calidad.",
            "Lanzar mas casos reales: SaaS, apps, paneles internos y presencia digital completa.",
        ]
        for i, b in enumerate(bullets):
            y = 175 + i * 95
            rounded(d, (96, y - 14, 1135, y + 58), 18, (255, 255, 255, 15), (*mix(CYAN, ROSE, i / 3), 65), 1)
            d.text((125, y), b, font=F["body"], fill=(232, 237, 250))
        draw_dashboard(d, 810, 380, 330, 220, p)

    else:
        glow(img, (640, 350), 300, ROSE, 95)
        d.text((640, 195), "ALTHERA", font=F["hero"], fill=WHITE, anchor="mm")
        d.text((640, 275), "Construimos tecnologia que se ve bien,\nfunciona mejor y ayuda a crecer.", font=F["h2"], fill=(225, 230, 255), anchor="mm", spacing=10)
        rounded(d, (445, 430, 835, 490), 30, (255, 255, 255, 22), (*FUCHSIA, 110), 2)
        d.text((640, 462), "2026: mas equipo, mas proyectos, mas impacto", font=F["small"], fill=WHITE, anchor="mm")

    # subtle frame vignette and lower caption
    vignette = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette, "RGBA")
    vd.rectangle((0, 0, W, 30), fill=(0, 0, 0, 90))
    vd.rectangle((0, H - 38, W, H), fill=(0, 0, 0, 110))
    img.alpha_composite(vignette)
    d = ImageDraw.Draw(img, "RGBA")
    d.text((44, H - 28), "Althera Solutions | Video explicativo corporativo", font=F["micro"], fill=(185, 193, 214))
    d.text((W - 44, H - 28), f"{int(t):02d}s", font=F["micro"], fill=(120, 130, 155), anchor="ra")
    return img.convert("RGB")


def main():
    OUT_DIR.mkdir(exist_ok=True)
    with imageio.get_writer(
        OUT_FILE,
        fps=FPS,
        codec="libx264",
        quality=8,
        macro_block_size=16,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    ) as writer:
        for frame in range(TOTAL_FRAMES):
            writer.append_data(np.asarray(scene(frame)))
            if frame % (FPS * 5) == 0:
                print(f"render {frame}/{TOTAL_FRAMES}")
    print(OUT_FILE)


if __name__ == "__main__":
    main()
