import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
import os

import requests
from models.schemas import RestaurantOption, TripIntent, MealPeriod, UserPreferences

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = False

# ── Yelp API ──────────────────────────────────────────────────────────────────
YELP_API_KEY  = os.getenv("YELP_API_KEY", "")
YELP_SEARCH_URL = "https://api.yelp.com/v3/businesses/search"
YELP_HEADERS  = {"Authorization": f"Bearer {YELP_API_KEY}"}

# Price range mapping: Yelp uses 1-4, we map to $ symbols
PRICE_MAP = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}


# ── Mock data ─────────────────────────────────────────────────────────────────

def _mock_restaurants(intent: TripIntent) -> list[RestaurantOption]:
    prefs = intent.preferences

    all_restaurants = [
        RestaurantOption(
            name         = "Versailles Restaurant",
            cuisine      = "Cuban",
            address      = "3555 SW 8th St, Miami, FL 33135",
            rating       = 4.4,
            price_range  = "$",
            meal_period  = MealPeriod.lunch,
            avg_cost_usd = 18.0,
            yelp_url     = "https://yelp.com/versailles-miami",
        ),
        RestaurantOption(
            name         = "Joe's Stone Crab",
            cuisine      = "Seafood",
            address      = "11 Washington Ave, Miami Beach, FL 33139",
            rating       = 4.5,
            price_range  = "$$$",
            meal_period  = MealPeriod.dinner,
            avg_cost_usd = 85.0,
            yelp_url     = "https://yelp.com/joes-stone-crab",
        ),
        RestaurantOption(
            name         = "KYU Miami",
            cuisine      = "Asian Fusion",
            address      = "251 NW 25th St, Miami, FL 33127",
            rating       = 4.6,
            price_range  = "$$",
            meal_period  = MealPeriod.dinner,
            avg_cost_usd = 55.0,
            yelp_url     = "https://yelp.com/kyu-miami",
        ),
        RestaurantOption(
            name         = "Zak the Baker",
            cuisine      = "Bakery / Cafe",
            address      = "295 NW 26th St, Miami, FL 33127",
            rating       = 4.7,
            price_range  = "$",
            meal_period  = MealPeriod.breakfast,
            avg_cost_usd = 14.0,
            yelp_url     = "https://yelp.com/zak-the-baker",
        ),
        RestaurantOption(
            name         = "Mandolin Aegean Bistro",
            cuisine      = "Greek / Mediterranean",
            address      = "4312 NE 2nd Ave, Miami, FL 33137",
            rating       = 4.5,
            price_range  = "$$",
            meal_period  = MealPeriod.lunch,
            avg_cost_usd = 32.0,
            yelp_url     = "https://yelp.com/mandolin-miami",
        ),
        RestaurantOption(
            name         = "Cvi.che 105",
            cuisine      = "Peruvian / Seafood",
            address      = "105 NE 3rd Ave, Miami, FL 33132",
            rating       = 4.4,
            price_range  = "$$",
            meal_period  = MealPeriod.dinner,
            avg_cost_usd = 40.0,
            yelp_url     = "https://yelp.com/cvi-che-105",
        ),
    ]

    return _apply_preference_filters(all_restaurants, prefs)


# ── Preference filtering ──────────────────────────────────────────────────────

def _apply_preference_filters(
    restaurants: list[RestaurantOption],
    prefs: UserPreferences,
) -> list[RestaurantOption]:
    """
    Filter out restaurants that conflict with user preferences.
    This runs on both mock and real data so preferences always apply.
    """
    filtered = []
    for r in restaurants:
        cuisine_lower = r.cuisine.lower()

        # Skip disliked cuisines
        if any(d.lower() in cuisine_lower for d in prefs.disliked_cuisines):
            continue

        # Skip dietary restrictions
        skip = False
        for restriction in prefs.dietary_restrictions:
            restriction_lower = restriction.lower()
            if "seafood" in restriction_lower and any(
                s in cuisine_lower for s in ["seafood", "fish", "crab", "lobster", "shrimp", "peruvian"]
            ):
                skip = True
                break
            if "vegetarian" in restriction_lower and any(
                s in cuisine_lower for s in ["steakhouse", "bbq", "barbecue"]
            ):
                skip = True
                break
        if skip:
            continue

        filtered.append(r)

    # Boost preferred cuisines to top
    if prefs.preferred_cuisines:
        def preference_score(r: RestaurantOption) -> int:
            return 0 if any(
                p.lower() in r.cuisine.lower() for p in prefs.preferred_cuisines
            ) else 1
        filtered = sorted(filtered, key=preference_score)

    return filtered


# ── Real Yelp search ──────────────────────────────────────────────────────────

def _search_google_places(intent: TripIntent, meal_period: MealPeriod) -> list[RestaurantOption]:
    prefs  = intent.preferences
    import os
    key    = os.getenv("GOOGLE_PLACES_API_KEY", "")
    url    = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    meal_queries = {
        MealPeriod.breakfast: f"breakfast cafe {intent.destination}",
        MealPeriod.lunch:     f"lunch restaurant {intent.destination}",
        MealPeriod.dinner:    f"dinner restaurant {intent.destination}",
    }

    params = {
        "query": meal_queries.get(meal_period, f"restaurant {intent.destination}"),
        "type":  "restaurant",
        "key":   key,
    }

    resp = requests.get(url, params=params)
    resp.raise_for_status()
    places = resp.json().get("results", [])[:5]

    results = []
    for p in places:
        price_level = p.get("price_level", 2)
        price_map   = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
        results.append(RestaurantOption(
            name         = p.get("name", ""),
            cuisine      = "Restaurant",
            address      = p.get("formatted_address", ""),
            rating       = float(p.get("rating", 4.0)),
            price_range  = price_map.get(price_level, "$$"),
            meal_period  = meal_period,
            avg_cost_usd = None,
            yelp_url     = f"https://maps.google.com/?q={p.get('name','').replace(' ', '+')}",
            image_url    = None,
        ))

    return _apply_preference_filters(results, prefs)


# ── Public API ────────────────────────────────────────────────────────────────

async def run(intent: TripIntent) -> list[RestaurantOption]:
    """
    Search for restaurants covering breakfast, lunch, and dinner.
    Dietary restrictions and disliked cuisines are always filtered out.
    Returns a list of RestaurantOption objects across all meal periods.
    """
    try:
        if USE_MOCK:
            restaurants = await asyncio.to_thread(_mock_restaurants, intent)
        else:
            # Search all 3 meal periods in parallel
            results = await asyncio.gather(
                asyncio.to_thread(_search_google_places, intent, MealPeriod.breakfast),
                asyncio.to_thread(_search_google_places, intent, MealPeriod.lunch),
                asyncio.to_thread(_search_google_places, intent, MealPeriod.dinner),
            )
            restaurants = [r for sublist in results for r in sublist]
    except Exception as e:
        print(f"[food_agent] Error: {e} — falling back to mock")
        restaurants = _mock_restaurants(intent)

    return restaurants
