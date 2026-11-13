# Squat and bench ratios to the deadlift, from OpenPowerlifting (public domain).
# Usage: python3 scripts/openpowerlifting-ratios.py <openpowerlifting-*.csv>
# Data: https://openpowerlifting.gitlab.io/opl-csv/files/openpowerlifting-latest.zip
# Raw (unequipped) full meets with all three lifts made; each lifter counted once, at their latest meet.
import csv, sys, statistics
path = sys.argv[1]
latest = {}
with open(path, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        if row['Event'] != 'SBD' or row['Equipment'] != 'Raw' or row['Place'] in ('DQ', 'DD', 'NS', 'G'):
            continue
        try:
            s, b, d, bw = (float(row[k]) for k in ('Best3SquatKg', 'Best3BenchKg', 'Best3DeadliftKg', 'BodyweightKg'))
        except ValueError:
            continue
        if min(s, b, d, bw) <= 0 or row['Sex'] not in ('M', 'F'):
            continue
        key = (row['Name'], row['Sex'])
        if key not in latest or row['Date'] > latest[key][0]:
            latest[key] = (row['Date'], row['Sex'], s, b, d, bw)

def q(values, p):
    values = sorted(values)
    return values[min(len(values) - 1, int(p * len(values)))]

for sex in ('M', 'F', 'all'):
    rows = [r for r in latest.values() if sex == 'all' or r[1] == sex]
    sq = [r[2] / r[4] for r in rows]
    be = [r[3] / r[4] for r in rows]
    dl = [r[4] / r[5] for r in rows]
    print(f"{sex}: lifters={len(rows)}")
    print(f"  squat/deadlift  p25={q(sq,.25):.3f} median={q(sq,.5):.3f} p75={q(sq,.75):.3f}")
    print(f"  bench/deadlift  p25={q(be,.25):.3f} median={q(be,.5):.3f} p75={q(be,.75):.3f}")
    print(f"  deadlift/bodyweight p10={q(dl,.1):.2f} p25={q(dl,.25):.2f} median={q(dl,.5):.2f}")
