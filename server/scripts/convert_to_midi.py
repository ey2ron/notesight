import sys
from pathlib import Path

try:
    from music21 import converter
except ImportError as exc:
    raise SystemExit("music21 is required. Install it with 'pip install music21'.") from exc

def convert_musicxml_to_midi(source: Path, destination: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"MusicXML file not found: {source}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    score = converter.parse(source)
    score.write('midi', fp=str(destination))


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print('Usage: convert_to_midi.py <musicxml_path> <midi_path>')
        return 1

    source = Path(argv[1]).expanduser().resolve()
    destination = Path(argv[2]).expanduser().resolve()
    convert_musicxml_to_midi(source, destination)
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
