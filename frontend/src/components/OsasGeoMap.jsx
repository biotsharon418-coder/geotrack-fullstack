// src/components/OsasGeoMap.jsx
//
// Interactive Leaflet map for the OSAS dashboard: one marker per student,
// placed at their most recently confirmed boarding house. Flagged
// students render as a red marker, everyone else green -- matching the
// color logic already used for badges elsewhere in the OSAS UI.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";

// LSPU-SPCC campus coordinates -- used both as the map's default center
// and as a fixed reference marker so distances on the map make sense.
const CAMPUS_CENTER = [14.0683, 121.325];

// Leaflet's default marker icon path breaks under Vite's bundling unless
// pointed at the package's own asset URLs explicitly.
const greenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "geotrack-marker-flagged", // tinted red via CSS filter, see osas.css
});

export default function OsasGeoMap({ height = 360 }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.osas
      .geoMapPoints()
      .then(setPoints)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-text">Loading map...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div style={{ height, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)" }}>
      <MapContainer center={CAMPUS_CENTER} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* LSPU-SPCC campus reference point */}
        <Circle center={CAMPUS_CENTER} radius={150} pathOptions={{ color: "#2f5d4f", fillOpacity: 0.15 }}>
          <Popup>LSPU-SPCC Campus</Popup>
        </Circle>

        {points.map((p, i) => (
          <Marker
            key={i}
            position={[p.latitude, p.longitude]}
            icon={p.is_flagged ? redIcon : greenIcon}
          >
            <Popup>
              <strong>{p.student_name}</strong>
              <br />
              {p.boarding_house_name}
              <br />
              <span style={{ color: "#857d6c" }}>{p.barangay}</span>
              {p.is_flagged && (
                <>
                  <br />
                  <span style={{ color: "#c1502e", fontWeight: 700 }}>Flagged</span>
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {points.length === 0 && (
        <div style={{ padding: 12, fontSize: 12, color: "#857d6c", textAlign: "center" }}>
          No students with a linked boarding house location yet.
        </div>
      )}
    </div>
  );
}
