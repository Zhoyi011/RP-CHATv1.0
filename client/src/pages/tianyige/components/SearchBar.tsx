// client/src/pages/tianyige/components/SearchBar.tsx
import React, { useState, useEffect, useRef } from "react";
import { Search, Compass } from "lucide-react";
import type { PlanetData } from "../types";

interface SearchBarProps {
  planets: PlanetData[];
  onSelectPlanet: (id: string) => void;
  selectedId: string | null;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  planets,
  onSelectPlanet,
  selectedId,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPlanets = planets.filter((planet) => {
    const q = query.toLowerCase();
    return (
      planet.name.toLowerCase().includes(q) ||
      planet.englishName.toLowerCase().includes(q)
    );
  });

  const selectedPlanet = planets.find((p) => p.id === selectedId);

  return (
    <div ref={containerRef} className="search-bar-wrapper">
      <div className="search-input-wrapper">
        <Search className="search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="搜索星体 (如: 地球 / Earth)..."
          className="search-input"
        />
        {selectedPlanet && (
          <div className="tracking-badge">
            <Compass className="tracking-icon" />
            <span>跟踪: {selectedPlanet.name}</span>
          </div>
        )}
      </div>

      {isOpen && filteredPlanets.length > 0 && (
        <div className="search-dropdown">
          {filteredPlanets.map((planet) => (
            <button
              key={planet.id}
              onClick={() => {
                onSelectPlanet(planet.id);
                setQuery("");
                setIsOpen(false);
              }}
              className="search-item"
            >
              <div className="search-item-left">
                <span
                  className="search-dot"
                  style={{ backgroundColor: planet.color }}
                />
                <span className="search-name">{planet.name}</span>
                <span className="search-en">{planet.englishName}</span>
              </div>
              <span className="search-type">
                {planet.id === "sun" ? "恒星" : "行星"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};