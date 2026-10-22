import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api from "../api";

interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
}

interface Place {
  place_id: number;
  place_name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number | null;
  best_time_to_visit?: string | null;
  visit_duration?: string | null;
  suitability?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  travel_tips?: string | null;
  facilities?: string | null;
  image?: string | null;
  category?: Category | null;
}

function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await api.get<Place[]>("/places");
        const data = response.data;

        const placeList = Array.isArray(data)
          ? data
          : (data as unknown as { places?: Place[] }).places;

        setPlaces(Array.isArray(placeList) ? placeList : []);
      } catch (error) {
        console.error("Failed to load places:", error);
        setErrorMessage(
          "We couldn't load destinations. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchPlaces();
  }, []);

  // Build category options from the categories in the database.
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
            <p>Find places to visit and start planning your day.</p>
          </div>

          <span className="section-mark">S / 01</span>
        </div>

        <div className="search-panel">
          <label htmlFor="place-search">
            Where would you like to go?
          </label>

          <div className="search-row">
            <input
              id="place-search"
              type="search"
              placeholder="Search by destination, description or category..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <button
              type="button"
              onClick={() =>
                document.getElementById("place-search")?.focus()
              }
            >
              Search <span>→</span>
            </button>
          </div>
        </div>

        <div className="category-filter">
          <label htmlFor="category-filter-select">
            Filter by category
          </label>

          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "All" ? "All Categories" : category}
              </option>
            ))}
          </select>

          {(selectedCategory !== "All" || searchText !== "") && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("All");
                setSearchText("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="places-section">
          {loading && (
            <div className="empty-state">
              <h3>Loading destinations...</h3>
              <p>Please wait while we retrieve local places.</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="empty-state">
              <h3>Unable to load destinations</h3>
              <p>{errorMessage}</p>

              <button
                className="retry-button"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            filteredPlaces.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">⌖</span>

                <h3>
                  {places.length === 0
                    ? "No destinations available yet"
                    : "No matching destinations found"}
                </h3>

                <p>
                  {places.length === 0
                    ? "Destinations will appear here when places are added to the database."
                    : "Try another category or search term, or clear the filters."}
                </p>

                {(searchText !== "" || selectedCategory !== "All") && (
                  <button
                    className="retry-button"
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setSelectedCategory("All");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

          {!loading &&
            !errorMessage &&
            filteredPlaces.length > 0 && (
              <>
                <div className="places-summary">
                  <span>
                    {filteredPlaces.length}{" "}
                    {filteredPlaces.length === 1
                      ? "destination"
                      : "destinations"}
                  </span>

                  <span>Hemmathagama and surrounding areas</span>
                </div>

                <div className="places-grid">
                  {filteredPlaces.map((place) => (
                    <article
                      className="place-card"
                      key={place.place_id}
                    >
                      <div className="place-card-art">
                        {place.image ? (
                          <img
                            src={place.image}
                            alt={place.place_name}
                            className="place-card-image"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="place-image-placeholder">
                            <span className="placeholder-icon">⌖</span>
                            <span>Image coming soon</span>
                          </div>
                        )}

                        <span className="place-category">
                          {place.category?.category_name ??
                            "Local destination"}
                        </span>

                        <span className="place-number">
                          {String(place.place_id).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="place-card-content">
                        <h3>
                          <Link to={`/places/${place.place_id}`}>
                            {place.place_name}
                          </Link>
                        </h3>

                        <p className="place-description">
                          {place.description ||
                            "Discover this local destination."}
                        </p>

                        {place.address && (
                          <p className="place-detail">
                            <strong>Location:</strong> {place.address}
                          </p>
                        )}

                        {place.distance != null && (
                          <p className="place-detail">
                            <strong>Distance:</strong> {place.distance} km
                          </p>
                        )}

                        {place.best_time_to_visit && (
                          <p className="place-detail">
                            <strong>Best time:</strong>{" "}
                            {place.best_time_to_visit}
                          </p>
                        )}

                        {place.visit_duration && (
                          <p className="place-detail">
                            <strong>Visit duration:</strong>{" "}
                            {place.visit_duration}
                          </p>
                        )}

                        {place.opening_time && (
                          <p className="place-detail">
                            <strong>Opens:</strong> {place.opening_time}
                          </p>
                        )}

                        {place.closing_time && (
                          <p className="place-detail">
                            <strong>Closes:</strong> {place.closing_time}
                          </p>
                        )}

                        {place.suitability && (
                          <p className="place-detail">
                            <strong>Suitable for:</strong>{" "}
                            {place.suitability}
                          </p>
                        )}

                        {place.facilities && (
                          <p className="place-detail">
                            <strong>Facilities:</strong> {place.facilities}
                          </p>
                        )}

                        {place.travel_tips && (
                          <p className="place-detail">
                            <strong>Travel tips:</strong> {place.travel_tips}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
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
