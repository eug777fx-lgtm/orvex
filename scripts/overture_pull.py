"""
Overture Maps Places pull for the Lithos Labs acquisition pilot (Phase 1).

Reads Overture's free Places dataset (CDLA Permissive 2.0) straight from
Overture's public S3 bucket with DuckDB, keeps businesses in the target metros
and niches, and writes:

  results/schema.txt            column names/types of the release (verifies the
                                category fields instead of assuming them)
  results/niche_places.csv      every matched business, flattened
  results/sample_<niche>.csv    50 random rows per niche for the hand-check
  results/summary.md            counts, data coverage, top categories, samples

Nothing is invented: every value comes from the Overture row. Empty fields
stay empty.

Env:
  OVERTURE_RELEASE   release folder (default: newest available)
  OVERTURE_SRC       local parquet glob instead of S3 (tests only)
  MIN_CONFIDENCE     default 0.5
  SAMPLE_SIZE        default 50
"""

import csv
import os
import sys
from pathlib import Path

import duckdb

BUCKET = "s3://overturemaps-us-west-2"
OUT = Path(os.environ.get("OUT_DIR", "results"))
MIN_CONF = float(os.environ.get("MIN_CONFIDENCE", "0.5"))
SAMPLE = int(os.environ.get("SAMPLE_SIZE", "50"))

# (name, lon_min, lat_min, lon_max, lat_max)
METROS = [
    # Hillsborough, Pinellas, Pasco
    ("Tampa Bay", -82.95, 27.55, -82.05, 28.48),
    # Orange, Seminole
    ("Orlando", -81.70, 28.25, -80.85, 28.85),
]

NICHES = {
    # name / category keyword rules; excludes obvious non-service "pool" places
    "pool_service": {
        "include": ["pool"],
        "exclude": ["billiard", "pool hall", "pool table", "carpool", "car pool", "pool party",
                    "liverpool", "whirlpool", "motor pool", "typing pool", "gene pool"],
    },
    "plumbing": {
        "include": ["plumb", "rooter", "drain clean", "water heater"],
        "exclude": [],
    },
    # backup niche from the plan, counted only for comparison
    "pest_control": {
        "include": ["pest", "extermin", "termite"],
        "exclude": [],
    },
}

con = duckdb.connect()


def q(sql, params=None):
    return con.execute(sql, params or []).fetchall()


def resolve_source():
    src = os.environ.get("OVERTURE_SRC")
    if src:
        return src, "local-test"
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    release = os.environ.get("OVERTURE_RELEASE", "").strip()
    if not release or release == "latest":
        rows = q(
            f"SELECT DISTINCT regexp_extract(file, 'release/([^/]+)/', 1) AS r "
            f"FROM glob('{BUCKET}/release/*/theme=places/type=place/*') ORDER BY r DESC"
        )
        if not rows:
            sys.exit("No Overture places releases found in the bucket.")
        release = rows[0][0]
    return f"{BUCKET}/release/{release}/theme=places/type=place/*", release


SRC, RELEASE = resolve_source()
OUT.mkdir(parents=True, exist_ok=True)
READ = f"read_parquet('{SRC}', hive_partitioning=1)"

# ---- schema (verify field names instead of assuming them) -------------------
schema = q(f"DESCRIBE SELECT * FROM {READ}")
cols = {r[0]: r[1] for r in schema}
(OUT / "schema.txt").write_text("\n".join(f"{n}: {t}" for n, t in cols.items()))


def has(col):
    return col in cols


# Category text: works with the old `categories` struct and the newer
# `basic_category` / `taxonomy` fields, whichever this release has.
cat_parts, cat_label = [], None
if has("basic_category"):
    cat_parts.append("coalesce(CAST(basic_category AS VARCHAR), '')")
    cat_label = "CAST(basic_category AS VARCHAR)"
if has("taxonomy"):
    cat_parts.append("coalesce(CAST(taxonomy AS VARCHAR), '')")
    if not cat_label:
        cat_label = "CAST(taxonomy AS VARCHAR)"
if has("categories"):
    cat_parts.append("coalesce(CAST(categories AS VARCHAR), '')")
    if not cat_label:
        cat_label = "categories.primary"
if not cat_parts:
    cat_parts.append("''")
    cat_label = "NULL"
CAT_TEXT = "lower(" + " || ' ' || ".join(cat_parts) + ")"


def first_of(col, field=None):
    if not has(col):
        return "NULL"
    t = cols[col].upper()
    if t.endswith("[]") or t.startswith("LIST") or "[]" in t:
        elem = f"{col}[1]"
        return f"CAST({elem}.{field} AS VARCHAR)" if field else f"CAST({elem} AS VARCHAR)"
    return f"CAST({col} AS VARCHAR)"


name_expr = "names.primary" if has("names") else "NULL"
addr_expr = lambda f: (f"CAST(addresses[1].{f} AS VARCHAR)" if has("addresses") else "NULL")  # noqa: E731
status_expr = "CAST(operating_status AS VARCHAR)" if has("operating_status") else "NULL"

metro_case = "CASE " + " ".join(
    f"WHEN bbox.xmin BETWEEN {a} AND {c} AND bbox.ymin BETWEEN {b} AND {d} THEN '{n}'"
    for n, a, b, c, d in METROS
) + " END"
metro_filter = " OR ".join(
    f"(bbox.xmin BETWEEN {a} AND {c} AND bbox.ymin BETWEEN {b} AND {d})" for _, a, b, c, d in METROS
)


def niche_case():
    parts = []
    for niche, rule in NICHES.items():
        inc = " OR ".join(
            f"(txt LIKE '%{w}%')" for w in rule["include"]
        )
        exc = " AND ".join(f"txt NOT LIKE '%{w}%'" for w in rule["exclude"]) or "TRUE"
        parts.append(f"WHEN ({inc}) AND ({exc}) THEN '{niche}'")
    return "CASE " + " ".join(parts) + " END"


con.execute(f"""
CREATE TABLE places AS
WITH base AS (
  SELECT
    id,
    {name_expr} AS name,
    {cat_label} AS category,
    {CAT_TEXT} AS cat_text,
    confidence,
    {status_expr} AS operating_status,
    {first_of('websites')} AS website,
    {first_of('phones')} AS phone,
    {first_of('emails')} AS email,
    {addr_expr('freeform')} AS address,
    {addr_expr('locality')} AS city,
    {addr_expr('region')} AS region,
    {addr_expr('postcode')} AS postcode,
    (bbox.xmin + bbox.xmax) / 2 AS lon,
    (bbox.ymin + bbox.ymax) / 2 AS lat,
    {metro_case} AS metro
  FROM {READ}
  WHERE {metro_filter}
),
tagged AS (
  SELECT *, lower(coalesce(name, '')) || ' ' || cat_text AS txt FROM base
)
SELECT * EXCLUDE (txt, cat_text), {niche_case().replace('txt', 'txt')} AS niche
FROM tagged
""")
con.execute("DELETE FROM places WHERE niche IS NULL")

total_all = q("SELECT count(*) FROM places")[0][0]
con.execute(f"CREATE TABLE kept AS SELECT * FROM places WHERE confidence >= {MIN_CONF}")


def write_csv(path, sql):
    res = con.execute(sql)
    names = [d[0] for d in res.description]
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(names)
        w.writerows(res.fetchall())


write_csv(OUT / "niche_places.csv", "SELECT * FROM kept ORDER BY niche, metro, name")
con.execute("SELECT setseed(0.42)")
for niche in NICHES:
    write_csv(
        OUT / f"sample_{niche}.csv",
        f"SELECT id, niche, metro, name, category, confidence, website, phone, email, address, city "
        f"FROM kept WHERE niche = '{niche}' ORDER BY random() LIMIT {SAMPLE}",
    )

# ---- summary ----------------------------------------------------------------
L = []
L.append(f"# Overture Places pull: {RELEASE}\n")
L.append(f"Metros: {', '.join(m[0] for m in METROS)}. Minimum confidence: {MIN_CONF}.\n")
L.append(f"Category fields in this release: "
         f"{', '.join(c for c in ('basic_category', 'taxonomy', 'categories') if has(c)) or 'none found'}.\n")
L.append(f"Matched before confidence filter: {total_all}.\n")

L.append("\n## Businesses per niche (confidence ≥ %.1f)\n" % MIN_CONF)
L.append("| Niche | Tampa Bay | Orlando | Total | Website | Phone | Email | Confidence ≥0.8 |")
L.append("|---|---|---|---|---|---|---|---|")
for niche in NICHES:
    r = q(f"""
      SELECT
        count(*) FILTER (WHERE metro = 'Tampa Bay'),
        count(*) FILTER (WHERE metro = 'Orlando'),
        count(*),
        count(*) FILTER (WHERE website IS NOT NULL AND website <> ''),
        count(*) FILTER (WHERE phone IS NOT NULL AND phone <> ''),
        count(*) FILTER (WHERE email IS NOT NULL AND email <> ''),
        count(*) FILTER (WHERE confidence >= 0.8)
      FROM kept WHERE niche = ?""", [niche])[0]
    t = r[2] or 0
    pct = lambda n: f"{n} ({round(100 * n / t)}%)" if t else "0"  # noqa: E731
    L.append(f"| {niche} | {r[0]} | {r[1]} | {t} | {pct(r[3])} | {pct(r[4])} | {pct(r[5])} | {pct(r[6])} |")

for niche in NICHES:
    L.append(f"\n## Top categories: {niche}\n")
    L.append("| Category | Count |")
    L.append("|---|---|")
    for cat, n in q(f"SELECT coalesce(category, '(none)'), count(*) FROM kept WHERE niche = ? "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 15", [niche]):
        L.append(f"| {str(cat)[:80]} | {n} |")

for niche in ("pool_service", "plumbing"):
    L.append(f"\n## Hand-check sample: {niche} (first 50, random)\n")
    L.append("| # | Name | City | Category | Website | Phone listed | Confidence |")
    L.append("|---|---|---|---|---|---|---|")
    rows = q(f"SELECT name, city, category, website, phone, confidence FROM read_csv_auto('{OUT / f'sample_{niche}.csv'}', all_varchar=true)")
    for i, (name, city, cat, web, phone, conf) in enumerate(rows, 1):
        dom = (web or "").replace("https://", "").replace("http://", "").split("/")[0]
        L.append(f"| {i} | {name or ''} | {city or ''} | {str(cat or '')[:40]} | {dom or 'none'} | "
                 f"{'yes' if phone else 'no'} | {conf} |")

summary = "\n".join(L) + "\n"
(OUT / "summary.md").write_text(summary)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
        f.write(summary)
print(summary)
