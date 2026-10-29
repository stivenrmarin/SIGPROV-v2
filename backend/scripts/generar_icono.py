"""Genera el icono de la aplicacion (build/icon.ico) sin dependencias externas.

Dibuja un emblema de panaderia: circulo naranja con una hoja de trigo
blanca, en el estilo de la marca (#EA580C sobre fondo caliza).

Uso:
    python scripts/generar_icono.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

BACKEND = Path(__file__).resolve().parent.parent
SALIDA = BACKEND.parent / "frontend" / "build" / "icon.ico"

NARANJA = (234, 88, 12, 255)
NARANJA_OSCURO = (194, 65, 12, 255)
CALIZA = (250, 249, 247, 255)
TRANSPARENTE = (0, 0, 0, 0)


def dibujar(tamano: int) -> Image.Image:
    """Dibuja el icono a una resolucion dada."""
    escala = 8  # supermuestreo para bordes limpios
    s = tamano * escala
    img = Image.new("RGBA", (s, s), TRANSPARENTE)
    d = ImageDraw.Draw(img)

    # Circulo de fondo con degradado radial simulado por capas
    for i in range(escala * 2, 0, -1):
        f = i / (escala * 2)
        color = (
            int(NARANJA[0] * f + NARANJA_OSCURO[0] * (1 - f)),
            int(NARANJA[1] * f + NARANJA_OSCURO[1] * (1 - f)),
            int(NARANJA[2] * f + NARANJA_OSCURO[2] * (1 - f)),
            255,
        )
        margen = int(s * 0.02 * i)
        d.ellipse([margen, margen, s - margen, s - margen], fill=color)

    # Espiga de trigo estilizada en el centro
    cx = s / 2
    cy = s / 2
    altura_espiga = s * 0.52
    ancho = s * 0.20

    # Tallo
    d.rounded_rectangle(
        [cx - ancho * 0.10, cy - altura_espiga * 0.42, cx + ancho * 0.10, cy + altura_espiga * 0.52],
        radius=int(s * 0.02),
        fill=CALIZA,
    )

    # Granos (hojas) alternados
    for i in range(4):
        t = i / 3
        y = cy - altura_espiga * 0.40 + altura_espiga * 0.42 * t
        largo = ancho * (1.05 - 0.16 * i)
        radio = int(s * 0.028)
        for signo in (-1, 1):
            d.ellipse(
                [
                    cx + signo * largo * 0.55 - largo * 0.55 - radio,
                    y - radio * 1.4,
                    cx + signo * largo * 0.55 - largo * 0.55 + largo + radio,
                    y + radio * 1.4,
                ],
                fill=CALIZA,
            )

    return img.resize((tamano, tamano), Image.LANCZOS)


def main() -> int:
    print("Generando icono de SIGPROV...")
    SALIDA.parent.mkdir(parents=True, exist_ok=True)

    # Multiples resoluciones dentro del .ico (Windows usa el que corresponde)
    tamanos = [16, 24, 32, 48, 64, 128, 256]
    imagenes = [dibujar(t) for t in tamanos]

    imagenes[-1].save(
        SALIDA,
        format="ICO",
        sizes=[(t, t) for t in tamanos],
    )

    # PNG grande para los recursos de la app
    png = SALIDA.with_suffix(".png")
    imagenes[-1].save(png, format="PNG")

    print(f"  {SALIDA}  ({SALIDA.stat().st_size / 1024:.1f} KB)")
    print(f"  {png}  ({png.stat().st_size / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
