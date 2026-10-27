"""Trim the self-hosted fonts (task 10, D-025): weights 400–700 only, Ethiopic files to U+1200–139F.

Usage (needs Python with fonttools + brotli, not a project dependency):
    python scripts/fonts/trim-fonts.py <folder with the Fontsource woff2 files> src/fonts
"""
import io, sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src_dir, out_dir = sys.argv[1], sys.argv[2]
JOBS = {
    # Ethiopic: the core Ethiopic block + supplement (spaces and Latin come from the Latin fonts).
    "NotoSansEthiopic-Variable.woff2": "U+1200-139F",
    "NotoSerifEthiopic-Variable.woff2": "U+1200-139F",
    # Latin: unchanged character set (the Fontsource "latin" range), only the weights are trimmed.
    "Inter-Latin-Variable.woff2": None,
    "SourceSerif4-Latin-Variable.woff2": None,
}
for name, ranges in JOBS.items():
    font = TTFont(os.path.join(src_dir, name))
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in font["fvar"].axes}
    limits = {}
    for tag, (lo, default, hi) in axes.items():
        if tag == "wght":
            limits["wght"] = (max(lo, 400), min(max(default, 400), 700), min(hi, 700))
        else:
            limits[tag] = default  # pin other axes (width, optical size) to their default
    font = instancer.instantiateVariableFont(font, limits)
    buffer = io.BytesIO()
    font.save(buffer)  # reload, so the subsetter sees fully loaded variation data
    buffer.seek(0)
    font = TTFont(buffer)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.drop_tables += ["DSIG"]
    s = subset.Subsetter(opts)
    if ranges:
        s.populate(unicodes=[cp for part in ranges.split(",") for cp in (
            range(int(part[2:].split("-")[0], 16), int(part[2:].split("-")[-1], 16) + 1))])
    else:
        s.populate(unicodes=font.getBestCmap().keys())
    s.subset(font)
    font.flavor = "woff2"
    out = os.path.join(out_dir, name)
    font.save(out)
    print(f"{name}: axes {axes} -> {os.path.getsize(os.path.join(src_dir, name))//1024} KB -> {os.path.getsize(out)//1024} KB")
