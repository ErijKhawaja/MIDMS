import ee
import sys


def test_gee():
    print("Initializing GEE...")
    try:
        ee.Initialize(project='droughtpakistan')
        print("GEE initialized successfully!")
    except Exception as e:
        print(f"GEE init failed: {e}")
        sys.exit(1)

    print("\nTesting VCI computation over Punjab, 3 months...")
    try:
        # Small region, short date range to save GEE compute
        punjab = ee.FeatureCollection(
            "projects/droughtpakistan/assets/Punjab_Districts"
        ).geometry()

        dataset = (ee.ImageCollection("MODIS/061/MOD13Q1")
                   .filterDate("2022-01-01", "2022-04-01")
                   .filterBounds(punjab)
                   .select("NDVI")
                   .map(lambda img: img.multiply(0.0001)
                        .copyProperties(img, ["system:time_start"])))

        ndvi_min = dataset.min()
        ndvi_max = dataset.max()

        vci = (dataset.mean()
                      .subtract(ndvi_min)
                      .divide(ndvi_max.subtract(ndvi_min))
                      .multiply(100)
                      .rename("VCI")
                      .clip(punjab))

        map_id = vci.getMapId({
            "min": 0, "max": 100,
            "palette": ["#8B4513", "#DAA520", "#228B22"]
        })

        tile_url = map_id["tile_fetcher"].url_format
        print(f"VCI tile URL generated successfully!")
        print(f"URL: {tile_url[:80]}...")
        print("\nAll tests passed!")

    except Exception as e:
        print(f"VCI computation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    test_gee()
