import { useMemo, useState } from "react";
import { DayRail } from "../components/DayTray";
import PlaceCard from "../components/PlaceCard";
import StartPointControl from "../components/StartPointControl";
import { Button } from "../components/ui/Button";
import { usePlaces } from "../lib/places";

function HomePage() {
  const { places, status, reload } = usePlaces();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Category options from the categories that have places
  const categories = useMemo(() => {
    const categoryNames = places
      .map((place) => place.category?.category_name?.trim())
      .filter((name): name is string => Boolean(name));

    return ["All", ...new Set(categoryNames)];
  }, [places]);

  // Apply category filtering and search together.
  const filteredPlaces = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return places.filter((place) => {
      const matchesCategory =
        selectedCategory === "All" ||
        place.category?.category_name?.trim() === selectedCategory;

      const searchableText = [
        place.place_name,
        place.description,
        place.address,
        place.category?.category_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [places, searchText, selectedCategory]);

  const filtersActive = selectedCategory !== "All" || searchText !== "";

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
  };

  return (
    <div className="app">
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="eyebrow">
            DISCOVER THE BEAUTY OF HEMMATHAGAMA
          </span>

          <h1>
            Your next adventure
            <br />
            starts <span>closer than you think.</span>
          </h1>

          <p>
            Discover beautiful local destinations, explore hidden gems,
            and create your perfect one-day visit plan with SabaTrail.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#explore">
              Explore Destinations <span>→</span>
            </a>

            <a className="secondary-button" href="#about">
              Discover SabaTrail
            </a>
          </div>

          <div className="hero-note">
            <span className="status-dot" />
            Your local journey starts here
          </div>
        </div>

        <div
          className="hero-art"
          aria-label="Nature-inspired travel illustration"
        >
          <div className="sun" />
          <div className="mountain mountain-back" />
          <div className="mountain mountain-front" />
          <div className="river" />

          <div className="art-label">
            <span>EXPLORE</span>
            <strong>Hemmathagama</strong>
            <span>SRI LANKA</span>
          </div>
        </div>
      </section>

      <section className="explore-section" id="explore">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR NEXT STOP</span>
            <h2>Explore local destinations</h2>
            <p>Find places to visit and add them to your day.</p>
          </div>
        </div>

        <div className="search-panel">
          <label htmlFor="place-search">
            Where would you like to go?
          </label>

          <div className="search-row">
            <input
              id="place-search"
              type="search"
              placeholder="Search by destination, description or category"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          <div className="category-chips" role="group" aria-label="Filter by category">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className="category-chip"
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category === "All" ? "All categories" : category}
              </button>
            ))}
          </div>
        </div>

        <div className="explore-layout">
        <div className="places-section">
          {status === "loading" && (
            <div className="empty-state" role="status">
              <h3>Loading destinations…</h3>
              <p>Please wait while we retrieve local places.</p>
            </div>
          )}

          {status === "error" && (
            <div className="empty-state" role="alert">
              <h3>Unable to load destinations</h3>
              <p>We couldn&apos;t reach SabaTrail. Check your connection and try again.</p>

              <Button variant="secondary" onClick={() => void reload()}>
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && (
            <>
              <div className="places-summary">
                <p aria-live="polite">
                  <strong>{filteredPlaces.length}</strong>{" "}
                  {filteredPlaces.length === 1 ? "destination" : "destinations"}
                  {filtersActive ? " match" : " around Hemmathagama"}
                </p>
                <StartPointControl />
              </div>

              {filteredPlaces.length === 0 ? (
                <div className="empty-state">
                  <h3>
                    {places.length === 0
                      ? "No destinations available yet"
                      : "No matching destinations found"}
                  </h3>

                  <p>
                    {places.length === 0
                      ? "Destinations will appear here when places are added."
                      : "Try another category or search term, or clear the filters."}
                  </p>

                  {filtersActive && (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="place-grid">
                  {filteredPlaces.map((place) => (
                    <li key={place.place_id}>
                      <PlaceCard place={place} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <DayRail />
        </div>
      </section>

      <section className="about-section" id="about">
        <div>
          <span className="eyebrow">TRAVEL WITH PURPOSE</span>
          <h2>Less searching. More exploring.</h2>
        </div>

        <p>
          SabaTrail helps you discover local attractions and organise
          them into a convenient one-day visit plan.
        </p>
      </section>
    </div>
  );
}

export default HomePage;
