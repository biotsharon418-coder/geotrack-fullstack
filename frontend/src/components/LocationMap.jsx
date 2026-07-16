// src/components/LocationMap.jsx
//
// Generic single-pin Leaflet map -- used by DormDetail to show wherever
// a specific boarding house is, regardless of whether it's the
// student's own dorm. (StudentMiniMap is the home-screen-specific
// version that always shows "my" boarding house.)

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LocationMap({ latitude, longitude, label, sublabel, height = 160 }) {
  if (latitude == null || longitude == null) {
    return (
      <div
        style={{
          height, borderRadius: 12, background: "#eef3ee", display: "flex",
          alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16,
        }}
      >
        <span style={{ fontSize: 12, color: "#857d6c" }}>
          Location not pinned for this boarding house yet.
        </span>
      </div>
    );
  }

  const position = [latitude, longitude];

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer center={position} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={pinIcon}>
          <Popup>
            <strong>{label}</strong>
            {sublabel && (<><br />{sublabel}</>)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
