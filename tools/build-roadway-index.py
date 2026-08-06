#!/usr/bin/env python3
"""Build the compact browser index used by the emergency route matcher.

The input is the NJDOT NJ_Roads shapefile (EPSG:3424).  The output keeps only
the numbered route families used by Emergency Assistance and converts the
geometry to WGS84, quantized to 1e-6 degrees with delta encoding.

Example:
    python tools/build-roadway-index.py \
      --source C:/path/to/NJ_Roads \
      --output data/roadways

The source is intentionally an offline build input; the raw NJDOT archive is
not shipped in the web app.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import struct
from collections import Counter, defaultdict
from pathlib import Path


ROUTE_SUBTYPES = {1, 2, 3, 4, 5, 6}
ROUTE_SUBTYPE_LABELS = {
    1: "Interstate",
    2: "US Route",
    3: "NJ State Highway",
    4: "Authority / Parkway / Expressway",
    5: "500 Series County Route",
    6: "600 / 700 Series County Route",
}
ROUTE_FAMILY_BY_SUBTYPE = {
    1: "state",
    2: "state",
    3: "state",
    4: "state",
    5: "county",
    6: "county",
}
EXCLUDED_ROUTE_SUBTYPES = {
    7: "Local Road",
    8: "Ramp / Connector",
}
TILE_SIZE_DEG = 0.1
COORD_SCALE = 1_000_000
MEASURE_SCALE = 100_000
FT_US_TO_M = 0.3048006096012192
GEOMETRY_SIMPLIFY_TOLERANCE_FT = 3.28084  # approximately 1 metre


class NJStatePlane:
    """Inverse EPSG:3424 (NAD83 / New Jersey State Plane feet US)."""

    def __init__(self) -> None:
        self.a = 6378137.0
        self.f = 1.0 / 298.257222101
        self.e2 = self.f * (2.0 - self.f)
        self.ep2 = self.e2 / (1.0 - self.e2)
        self.k0 = 0.9999
        self.lon0 = math.radians(-74.5)
        self.lat0 = math.radians(38.83333333333334)
        self.false_easting = 492125.0 * FT_US_TO_M
        self.false_northing = 0.0
        self.m0 = self._meridional_arc(self.lat0)
        self.e1 = (1.0 - math.sqrt(1.0 - self.e2)) / (1.0 + math.sqrt(1.0 - self.e2))

    def _meridional_arc(self, phi: float) -> float:
        e2 = self.e2
        return self.a * (
            (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * phi
            - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * phi)
            + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * phi)
            - (35 * e2**3 / 3072) * math.sin(6 * phi)
        )

    def inverse(self, x_feet: float, y_feet: float) -> tuple[float, float]:
        x = x_feet * FT_US_TO_M
        y = y_feet * FT_US_TO_M
        m = self.m0 + (y - self.false_northing) / self.k0
        mu = m / (self.a * (1 - self.e2 / 4 - 3 * self.e2**2 / 64 - 5 * self.e2**3 / 256))
        e1 = self.e1
        phi1 = (
            mu
            + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
            + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
            + (151 * e1**3 / 96) * math.sin(6 * mu)
            + (1097 * e1**4 / 512) * math.sin(8 * mu)
        )

        sin_phi = math.sin(phi1)
        cos_phi = math.cos(phi1)
        tan_phi = math.tan(phi1)
        n1 = self.a / math.sqrt(1 - self.e2 * sin_phi**2)
        r1 = self.a * (1 - self.e2) / (1 - self.e2 * sin_phi**2) ** 1.5
        c1 = self.ep2 * cos_phi**2
        t1 = tan_phi**2
        d = (x - self.false_easting) / (n1 * self.k0)

        lat = phi1 - (n1 * tan_phi / r1) * (
            d**2 / 2
            - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * self.ep2) * d**4 / 24
            + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * self.ep2 - 3 * c1**2) * d**6 / 720
        )
        lon = self.lon0 + (
            d
            - (1 + 2 * t1 + c1) * d**3 / 6
            + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * self.ep2 + 24 * t1**2) * d**5 / 120
        ) / cos_phi
        return math.degrees(lat), math.degrees(lon)


def read_dbf_records(base: Path) -> list[dict[str, str]]:
    raw = base.with_suffix(".dbf").read_bytes()
    record_count = struct.unpack_from("<I", raw, 4)[0]
    header_length = struct.unpack_from("<H", raw, 8)[0]
    record_length = struct.unpack_from("<H", raw, 10)[0]

    fields: list[tuple[str, int]] = []
    offset = 32
    while raw[offset] != 0x0D:
        descriptor = raw[offset : offset + 32]
        name = descriptor[:11].split(b"\0", 1)[0].decode("ascii", "replace")
        fields.append((name, descriptor[16]))
        offset += 32

    records: list[dict[str, str]] = []
    for index in range(record_count):
        record = raw[header_length + index * record_length : header_length + (index + 1) * record_length]
        values: dict[str, str] = {}
        cursor = 1  # deletion flag
        for name, width in fields:
            values[name] = record[cursor : cursor + width].decode("utf-8", "replace").strip()
            cursor += width
        records.append(values)
    return records


def iter_shapefile_shapes(base: Path):
    with base.with_suffix(".shp").open("rb") as handle:
        header = handle.read(100)
        if len(header) != 100 or struct.unpack_from(">i", header, 0)[0] != 9994:
            raise ValueError("not a valid shapefile")
        while True:
            record_header = handle.read(8)
            if not record_header:
                return
            if len(record_header) != 8:
                raise ValueError("truncated shapefile record header")
            content_length = struct.unpack_from(">i", record_header, 4)[0] * 2
            body = handle.read(content_length)
            if len(body) != content_length:
                raise ValueError("truncated shapefile record")
            shape_type = struct.unpack_from("<i", body, 0)[0]
            if shape_type == 0:
                yield []
                continue
            # The downloaded NJDOT shapefile is PolyLineM (23).  Keep the
            # calibrated vertex measures as well as XY; they are more precise
            # than interpolating MP_START/MP_END by geometric length.
            if shape_type not in {3, 13, 23, 25}:
                raise ValueError(f"unsupported geometry type {shape_type}; expected a PolyLine variant")
            part_count, point_count = struct.unpack_from("<ii", body, 36)
            part_offsets = struct.unpack_from(f"<{part_count}i", body, 44)
            point_offset = 44 + 4 * part_count
            xy_points = [
                struct.unpack_from("<2d", body, point_offset + index * 16)
                for index in range(point_count)
            ]
            measures: list[float | None] = [None] * point_count
            if shape_type in {23, 25}:
                measure_offset = point_offset + 16 * point_count + 16
                if measure_offset + 8 * point_count <= len(body):
                    measures = [struct.unpack_from("<d", body, measure_offset + index * 8)[0] for index in range(point_count)]
            elif shape_type in {13, 15}:
                # PolyLineZ/PolygonZ place M after the XY and Z arrays.
                measure_offset = point_offset + 16 * point_count + 16 + 8 * point_count + 16
                if measure_offset + 8 * point_count <= len(body):
                    measures = [struct.unpack_from("<d", body, measure_offset + index * 8)[0] for index in range(point_count)]
            points = [(xy_points[index][0], xy_points[index][1], measures[index]) for index in range(point_count)]
            parts = []
            for part_index, start in enumerate(part_offsets):
                end = part_offsets[part_index + 1] if part_index + 1 < len(part_offsets) else point_count
                parts.append(points[start:end])
            yield parts


def numeric(value: str, fallback: float | None = None) -> float | None:
    if not value:
        return fallback
    try:
        return float(value)
    except ValueError:
        return fallback


def clean_sri(value: str) -> str:
    """Return a stable SRI string without padding whitespace."""
    return str(value or "").strip()


def canonical_sri(record: dict[str, str]) -> str:
    """Use NJDOT's parent SRI as the signed-route identity.

    PARENT_SRI is documented by NJDOT as the highest-level route segment that
    carries the route number and mileage.  It therefore groups secondary
    directions, express lanes, and other associated carriageways with the
    signed route they belong to.  Older/source variants without PARENT_SRI
    safely fall back to their own SRI; that preserves the route rather than
    inventing an identity.
    """
    return clean_sri(record.get("PARENT_SRI", "")) or clean_sri(record.get("SRI", ""))


def segment_role(record: dict[str, str]) -> str:
    """Describe the relationship between a segment and its parent route."""
    sri = clean_sri(record.get("SRI", ""))
    parent = canonical_sri(record)
    if not sri or sri == parent:
        return "primary"
    return "associated-carriageway"


def point_segment_distance_sq(point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]) -> float:
    px, py = point[0], point[1]
    sx, sy = start[0], start[1]
    ex, ey = end[0], end[1]
    vx = ex - sx
    vy = ey - sy
    length_sq = vx * vx + vy * vy
    if length_sq == 0:
        dx = px - sx
        dy = py - sy
        return dx * dx + dy * dy
    fraction = max(0.0, min(1.0, ((px - sx) * vx + (py - sy) * vy) / length_sq))
    dx = px - (sx + fraction * vx)
    dy = py - (sy + fraction * vy)
    return dx * dx + dy * dy


def simplify_path(points: list[tuple[float, float]], tolerance_ft: float) -> list[tuple[float, float]]:
    """Douglas-Peucker simplify in the source State Plane feet."""
    if len(points) <= 2:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    threshold = tolerance_ft * tolerance_ft
    stack = [(0, len(points) - 1)]
    while stack:
        start_index, end_index = stack.pop()
        max_distance = threshold
        split_index = -1
        start = points[start_index]
        end = points[end_index]
        for index in range(start_index + 1, end_index):
            distance = point_segment_distance_sq(points[index], start, end)
            if distance > max_distance:
                max_distance = distance
                split_index = index
        if split_index >= 0:
            keep[split_index] = True
            stack.append((start_index, split_index))
            stack.append((split_index, end_index))
    return [point for index, point in enumerate(points) if keep[index]]


def quantized_path(points: list[tuple[float, float, float | None]], projection: NJStatePlane) -> tuple[list[int], list[int]]:
    encoded: list[int] = []
    absolute_measures: list[int] = []
    previous_lat: int | None = None
    previous_lon: int | None = None
    previous_measure: int | None = None
    have_all_measures = True
    for x, y, measure in points:
        lat, lon = projection.inverse(x, y)
        q_lat = int(round(lat * COORD_SCALE))
        q_lon = int(round(lon * COORD_SCALE))
        if previous_lat is not None and q_lat == previous_lat and q_lon == previous_lon:
            continue
        if previous_lat is None:
            encoded.extend([q_lat, q_lon])
        else:
            encoded.extend([q_lat - previous_lat, q_lon - previous_lon])
        previous_lat = q_lat
        previous_lon = q_lon
        if measure is None:
            have_all_measures = False
        else:
            q_measure = int(round(measure * MEASURE_SCALE))
            absolute_measures.append(q_measure if previous_measure is None else q_measure - previous_measure)
            previous_measure = q_measure
    return encoded, absolute_measures if have_all_measures else []


def decode_bounds(encoded: list[int]) -> list[int]:
    lat = encoded[0]
    lon = encoded[1]
    min_lat = max_lat = lat
    min_lon = max_lon = lon
    for index in range(2, len(encoded), 2):
        lat += encoded[index]
        lon += encoded[index + 1]
        min_lat = min(min_lat, lat)
        max_lat = max(max_lat, lat)
        min_lon = min(min_lon, lon)
        max_lon = max(max_lon, lon)
    return [min_lat, min_lon, max_lat, max_lon]


def tile_key(lat_index: int, lon_index: int) -> str:
    return f"{lat_index}_{lon_index}"


def build(source: Path, output: Path, force: bool) -> None:
    source = source.with_suffix("")
    required = [source.with_suffix(extension) for extension in (".dbf", ".shp")]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("missing shapefile component(s): " + ", ".join(missing))
    if output.exists() and any(output.iterdir()) and not force:
        raise FileExistsError(f"output directory is not empty: {output} (use --force to rebuild)")
    output.mkdir(parents=True, exist_ok=True)

    records = read_dbf_records(source)
    projection = NJStatePlane()
    tiles: defaultdict[str, list[list[object]]] = defaultdict(list)
    subtype_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    segment_count = 0

    canonical_routes: dict[str, dict[str, str]] = {}
    for record in records:
        subtype = int(record.get("ROUTE_SUBT", "0") or 0)
        if record.get("ACTIVE") != "Y" or subtype not in ROUTE_SUBTYPES:
            continue
        sri = clean_sri(record.get("SRI", ""))
        parent = canonical_sri(record)
        if not parent:
            continue
        current = canonical_routes.get(parent)
        if current is None or sri == parent:
            canonical_routes[parent] = {
                "name": record.get("SLD_NAME", ""),
                "roadNumber": record.get("ROAD_NUM", ""),
            }

    for record_index, (record, parts) in enumerate(zip(records, iter_shapefile_shapes(source))):
        subtype = int(record.get("ROUTE_SUBT", "0") or 0)
        if record.get("ACTIVE") != "Y" or subtype not in ROUTE_SUBTYPES:
            continue
        if not parts:
            continue
        # NJ_Roads is documented as single-part, but preserving all parts here
        # keeps the builder safe if a later source revision contains one.
        encoded_parts = [quantized_path(simplify_path(part, GEOMETRY_SIMPLIFY_TOLERANCE_FT), projection) for part in parts]
        encoded_parts = [part for part in encoded_parts if len(part[0]) >= 4]
        if not encoded_parts:
            continue

        # The runtime currently consumes one path.  If a future source has
        # multiple parts, concatenate only when the boundary is not duplicated;
        # all current NJDOT segments are one-part, so this is deterministic.
        encoded = encoded_parts[0][0]
        encoded_measures = encoded_parts[0][1]
        if len(encoded_parts) > 1:
            for extra in encoded_parts[1:]:
                encoded.extend(extra[0])
                if encoded_measures and extra[1]:
                    encoded_measures.extend(extra[1])
                else:
                    encoded_measures = []
        bounds = decode_bounds(encoded)
        mp_start = numeric(record.get("MP_START", ""))
        mp_end = numeric(record.get("MP_END", ""))
        if mp_start is None or mp_end is None:
            continue

        parent_sri = canonical_sri(record)
        role = segment_role(record)
        canonical = canonical_routes.get(parent_sri, {})

        segment: list[object] = [
            record_index,
            subtype,
            clean_sri(record.get("SRI", "")),
            record.get("SLD_NAME", ""),
            record.get("ROAD_NUM", ""),
            round(mp_start, 5),
            round(mp_end, 5),
            record.get("DIRECTION", ""),
            bounds,
            encoded,
            encoded_measures,
            parent_sri,
            role,
            canonical.get("name", record.get("SLD_NAME", "")),
            canonical.get("roadNumber", record.get("ROAD_NUM", "")),
        ]
        segment_count += 1
        subtype_counts[str(subtype)] += 1
        role_counts[role] += 1

        min_lat, min_lon, max_lat, max_lon = bounds
        min_lat_index = math.floor((min_lat / COORD_SCALE) / TILE_SIZE_DEG)
        max_lat_index = math.floor((max_lat / COORD_SCALE) / TILE_SIZE_DEG)
        min_lon_index = math.floor((min_lon / COORD_SCALE) / TILE_SIZE_DEG)
        max_lon_index = math.floor((max_lon / COORD_SCALE) / TILE_SIZE_DEG)
        for lat_index in range(min_lat_index, max_lat_index + 1):
            for lon_index in range(min_lon_index, max_lon_index + 1):
                tiles[tile_key(lat_index, lon_index)].append(segment)

    index_tiles: dict[str, dict[str, object]] = {}
    tile_entry_count = 0
    for key in sorted(tiles):
        segments = sorted(tiles[key], key=lambda value: (int(value[1]), str(value[2]), int(value[0])))
        path = output / "chunks" / f"{key}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"tile": key, "segments": segments}
        path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        tile_entry_count += len(segments)
        index_tiles[key] = {"count": len(segments), "file": f"data/roadways/chunks/{key}.json"}

    index = {
        "version": 2,
        "source": "NJDOT NJ Roadway Network File",
        "sourceRelease": "August 2025",
        "sourceCrs": "EPSG:3424",
        "coordinateSystem": "WGS84 latitude/longitude",
        "coordinateScale": COORD_SCALE,
        "measureScale": MEASURE_SCALE,
        "tileSizeDeg": TILE_SIZE_DEG,
        "routeSubtypes": {str(key): value for key, value in ROUTE_SUBTYPE_LABELS.items()},
        "routeClassification": {
            "sourceField": "ROUTE_SUBTYPE",
            "stateSubtypes": ["1", "2", "3", "4"],
            "countySubtypes": ["5", "6"],
            "excludedSubtypes": {str(key): value for key, value in EXCLUDED_ROUTE_SUBTYPES.items()},
            "canonicalRouteField": "PARENT_SRI",
            "segmentRoleRule": "primary when SRI equals PARENT_SRI; otherwise associated-carriageway",
        },
        "segmentFields": [
            "sourceId", "routeSubtype", "sri", "segmentName", "roadNumber",
            "mpStart", "mpEnd", "direction", "bounds", "encodedPath",
            "encodedMeasures", "parentSri", "segmentRole", "canonicalName",
            "canonicalRoadNumber",
        ],
        "totalSegments": segment_count,
        "totalTileEntries": tile_entry_count,
        "segmentsBySubtype": dict(sorted(subtype_counts.items())),
        "segmentsByRole": dict(sorted(role_counts.items())),
        "generatedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "tiles": index_tiles,
    }
    (output / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(json.dumps({
        "output": str(output),
        "segments": segment_count,
        "tileEntries": tile_entry_count,
        "tiles": len(index_tiles),
        "segmentsBySubtype": dict(sorted(subtype_counts.items())),
        "segmentsByRole": dict(sorted(role_counts.items())),
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Path without extension to NJ_Roads.shp/.dbf")
    parser.add_argument("--output", required=True, type=Path, help="Output data/roadways directory")
    parser.add_argument("--force", action="store_true", help="Allow writing into a non-empty output directory")
    args = parser.parse_args()
    build(args.source, args.output, args.force)


if __name__ == "__main__":
    main()
