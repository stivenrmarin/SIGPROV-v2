"""F0-1: Convierte escapes \\uXXXX literales a caracteres UTF-8 reales.

Garantiza equivalencia runtime: extrae todas las constantes string de cada
modulo ANTES y DESPUES del cambio y exige que sean identicas. Si un modulo
cambia de comportamiento, no se escribe el archivo.
"""

from __future__ import annotations

import ast
import pathlib
import re
import sys

ESCAPE_RE = re.compile(r"\\u([0-9a-fA-F]{4})")


def string_constants(tree: ast.AST) -> list[str]:
    """Extrae todas las constantes string de un modulo (valores post-parse)."""
    values: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            values.append(node.value)
    return values


def main() -> int:
    base = pathlib.Path(sys.argv[1])

    targets: list[pathlib.Path] = []
    for sub in ("app", "scripts", "tests"):
        folder = base / sub
        if folder.exists():
            targets += [f for f in sorted(folder.rglob("*.py")) if "__pycache__" not in f.parts]

    # Archivos .sql: los escapes \uXXXX NO se interpretan en SQL, se insertan
    # literalmente en la base de datos, asi que hay que convertirlos.
    sql_dir = base / "sql"
    if sql_dir.exists():
        targets += sorted(sql_dir.rglob("*.sql"))

    for extra in ("requirements.txt", "requirements-dev.txt", "Dockerfile"):
        candidate = base / extra
        if candidate.exists():
            targets.append(candidate)

    changed = 0
    skipped: list[str] = []
    unchanged = 0

    for path in targets:
        raw = path.read_bytes()
        text = raw.decode("utf-8")

        if not ESCAPE_RE.search(text):
            unchanged += 1
            continue

        new_text = ESCAPE_RE.sub(lambda m: chr(int(m.group(1), 16)), text)

        # Verificacion de equivalencia: solo para modulos Python.
        if path.suffix == ".py":
            try:
                before = string_constants(ast.parse(text))
                after = string_constants(ast.parse(new_text))
            except SyntaxError as exc:
                skipped.append(f"{path.name}: no parsea tras el cambio ({exc})")
                continue

            if before != after:
                skipped.append(f"{path.name}: cambio de comportamiento, NO se escribe")
                continue

        path.write_bytes(new_text.encode("utf-8"))
        changed += 1
        print(f"  OK  {path.relative_to(base)}")

    print()
    print(f"Archivos modificados: {changed}")
    print(f"Archivos sin escapes: {unchanged}")
    print(f"Omitidos: {len(skipped)}")
    for msg in skipped:
        print(f"  ! {msg}")

    return 1 if skipped else 0


if __name__ == "__main__":
    raise SystemExit(main())
