from pathlib import Path

p = Path(r"e:\MPhil2024\Droughts\APP\MIDMS\backend\midms_gee_engine.py")
text = p.read_text(encoding="utf-8")

old = r'''        std_img = (monthly_base.reduce(ee.Reducer.stdDev())
                   .max(ee.Image.constant(1e-6)))

        chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                  .filterDate(start_date, end_date)
                  .filterBounds(geometry)
                  .select("precipitation"))
        monthly = ee.ImageCollection(ee.List(years.map(
            lambda y: months.map(lambda m: (
                chirps.filterDate(ee.Date.fromYMD(y, m, 1), ee.Date.fromYMD(y, m, 1).advance(1, "month"))
                      .sum().set({"system:time_start": ee.Date.fromYMD(y, m, 1).millis(), "year": y, "month": m})
            ))
        )).flatten())
        return monthly.map(lambda img: img.subtract(mean_img).divide(std_img).rename("SPI")
                                          .set("year", img.get("year"), "month": img.get("month"),
                                               "system:time_start", img.get("system:time_start")))'''

new = r'''        chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
                  .filterDate(start_date, end_date)
                  .filterBounds(geometry)
                  .select("precipitation"))
        monthly = _chirps_monthly_sums(chirps, start_date, end_date)

        ts = ee.Number(3)
        monthly_list = monthly.toList(monthly.size())
        n = monthly.size()

        def make_rolling_sp(i):
            i = ee.Number(i)
            start_i = i.subtract(ts).add(1).max(0)
            window = ee.ImageCollection(monthly_list.slice(start_i, i.add(1)))
            rolling_sum = window.sum()
            ref_img = ee.Image(monthly_list.get(i))
            return rolling_sum.set({
                "system:time_start": ref_img.get("system:time_start"),
                "year": ref_img.get("year"),
                "month": ref_img.get("month"),
            })

        indices_sp = ee.List.sequence(ts.subtract(1), n.subtract(1))
        rolled_col = ee.ImageCollection(indices_sp.map(make_rolling_sp))

        monthly_baseline_list = monthly_base.toList(monthly_base.size())
        n_base = monthly_base.size()
        indices_base_sp = ee.List.sequence(ts.subtract(1), n_base.subtract(1))

        def make_rolling_base_sp(i):
            i = ee.Number(i)
            start_i = i.subtract(ts).add(1).max(0)
            window = ee.ImageCollection(monthly_baseline_list.slice(start_i, i.add(1)))
            return window.sum()

        rolled_baseline = ee.ImageCollection(indices_base_sp.map(make_rolling_base_sp))
        mean_img = rolled_baseline.mean()
        std_img = (rolled_baseline.reduce(ee.Reducer.stdDev())
                   .max(ee.Image.constant(1e-6)))

        spi_tagged = rolled_col.map(
            lambda img: img.subtract(mean_img).divide(std_img).rename("SPI")
            .set("year", img.get("year"), "month": img.get("month"),
                 "system:time_start", img.get("system:time_start"))
        )
        return spi_tagged.map(
            lambda img: img.select("SPI").copyProperties(
                img, ["system:time_start", "year", "month"]
            )
        )'''

if old not in text:
    raise SystemExit("OLD block not found")
text = text.replace(old, new, 1)
p.write_text(text, encoding="utf-8")
print("OK")
