// src/components/StudentMiniMap.jsx
//
// Small Leaflet map for the student's home screen, centered on their
// own boarding house (pulled from /api/student/my-boarding-house).
// If they haven't linked a boarding house through a status update yet,
// shows a friendly empty state instead of an empty map.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";

const CAMPUS_CENTER = [14.0683, 121.325];

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function StudentMiniMap({ height = 160 }) {
  const [house, setHouse] = useState(undefined); // undefined = loading, null = none yet
  const [error, setError] = useState("");

  useEffect(() => {
    api.student
      .myBoardingHouse()
      .then(setHouse)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (house === undefined) return <div className="loading-text">Loading map...</div>;

  if (!house || house.latitude == null || house.longitude == null) {
    return (
      <div
        style={{
          height, borderRadius: 12, background: "#eef3ee", display: "flex",
          alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16,
        }}
      >
        <span style={{ fontSize: 12, color: "#857d6c" }}>
          Submit a status update with your boarding house to see it on the map.
        </span>
      </div>
    );
  }

  const position = [house.latitude, house.longitude];

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer center={position} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={pinIcon}>
          <Popup>
            <strong>{house.name}</strong>
            <br />
            {house.barangay}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
