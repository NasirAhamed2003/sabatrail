import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import api from "../api";

interface Place {
  place_id: number;
  place_name: string;
  description?: string | null;
  address?: string | null;
  distance?: number | null;
  image?: string | null;
  category?: { category_name: string } | null;
}

export default function PlaceDetailsPage() {
  const { id } = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let active = true;

    api
      .get<Place>(`/places/${id}`)
      .then((response) => {
        if (!active) return;
        setPlace(response.data);
        setStatus("ready");
      })
      .catch((error: { response?: { status?: number } }) => {
        if (!active) return;
        setStatus(error.response?.status === 404 || error.response?.status === 400 ? "missing" : "error");
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <section className="container status-page" role="status">
        <p>Loading destination...</p>
      </section>
    );
  }

  if (status !== "ready" || !place) {
    return (
      <section className="container status-page">
        <h1>{status === "missing" ? "Destination not found" : "Couldn't load this destination"}</h1>
        <p>
          {status === "missing"
            ? "It may have been removed."
            : "Check your connection and try again."}
        </p>
        <Link to="/#explore">Back to destinations</Link>
      </section>
    );
  }

  return (
    <article className="container status-page">
      <Link to="/#explore">← All destinations</Link>
      <h1>{place.place_name}</h1>
      {place.category && <p>{place.category.category_name}</p>}
      {place.image && <img src={place.image} alt={place.place_name} />}
      {place.description && <p>{place.description}</p>}
    </article>
  );
}
