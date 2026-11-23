"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { CITY_NETWORKS } from "../lib/city-networks";
import {
  cityDragPosition,
  cityDragIntent,
  cityDragRelease,
  cityCaptureEnded,
  type CityDragIntent,
  cityOrbitPose,
  cityOrbitSlots,
  wrapCityIndex,
} from "../lib/city-orbit";
import photos from "../lib/city-photos.json";
import "./city-orbit.css";

type City = (typeof CITY_NETWORKS)[number];
export function CityOrbit({
  cities,
  prefix,
}: {
  cities: City[];
  prefix: string;
}) {
  const [active, setActive] = useState(0),
    [drag, setDrag] = useState(0),
    [dragging, setDragging] = useState(false),
    [viewport, setViewport] = useState(1200);
  const stage = useRef<HTMLDivElement>(null);
  const [imagesEnabled,setImagesEnabled]=useState(false);
  useEffect(()=>{
    const node=stage.current;if(!node)return;
    if(!('IntersectionObserver' in window)){setImagesEnabled(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setImagesEnabled(true);observer.disconnect();}
    },{rootMargin:'200px'});
    observer.observe(node);return()=>observer.disconnect();
  },[]);
  const gesture = useRef<{
    x: number;
    y: number;
    id: number;
    axis: CityDragIntent;
    origin: number;
    spacing: number;
  } | null>(null);
  const suppressClick = useRef(0);
  const step = (direction: number) => {
    setDrag(0);
    setActive((index) => wrapCityIndex(index + direction, cities.length));
  };
  const index = wrapCityIndex(active, cities.length);
  useEffect(() => {
    setActive(0);
    setDrag(0);
    gesture.current = null;
    setDragging(false);
  }, [cities.map((c) => c.key).join("|")]);
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    let distance = 0,
      last = 0;
    function wheel(event: WheelEvent) {
      if (event.ctrlKey || cities.length < 2) return;
      event.preventDefault();
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const now = Date.now();
      if (now - last < 240) return;
      distance += delta;
      if (Math.abs(distance) > 45) {
        setActive((i) =>
          wrapCityIndex(i + (distance > 0 ? 1 : -1), cities.length),
        );
        distance = 0;
        last = now;
      }
    }
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [cities.length]);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false || cities.length < 2 || gesture.current) return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      axis: "pending",
      origin: active,
      spacing:
        viewport <= 700 ? viewport * 0.39 : Math.min(viewport * 0.27, 325),
    };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    if (current.axis === "pending") {
      current.axis = cityDragIntent(dx, dy);
      if (current.axis === "horizontal") {
        setDragging(true);
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
      }
    }
    if (current.axis === "horizontal") {
      const position = cityDragPosition(current.origin, dx, current.spacing);
      setActive(position.active);
      setDrag(position.fraction);
      suppressClick.current = Date.now() + 350;
    }
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (current.axis === "horizontal") {
      // Include the release coordinate when the browser coalesces the last move.
      setActive(
        cityDragRelease(
          current.origin,
          event.clientX - current.x,
          current.spacing,
        ),
      );
      suppressClick.current = Date.now() + 350;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gesture.current = null;
    setDrag(0);
    setDragging(false);
  }
  return (
    <div
      className="cm-orbit"
      role="region"
      aria-label="Stadtnetzwerke im Karussell"
      aria-roledescription="Karussell"
    >
      <div
        ref={stage}
        data-active-city={cities[index]?.key || ""}
        className={`cm-orbit-stage${dragging ? " is-dragging" : ""}`}
        tabIndex={0}
        aria-label="Städte mit Maus oder Finger drehen. Pfeiltasten wechseln die Stadt."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(0);
          setDragging(false);
        }}
        onLostPointerCapture={(event) => {
          if (!cityCaptureEnded(gesture.current?.id,event.pointerId,event.target===event.currentTarget)) return;
          gesture.current = null;
          setDrag(0);
          setDragging(false);
        }}
        onClickCapture={(event) => {
          if (Date.now() < suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            step(event.key === "ArrowRight" ? 1 : -1);
            stage.current?.focus();
          }
        }}
      >
        {(cities.length >= 7
          ? [-3, -2, -1, 0, 1, 2, 3]
          : cityOrbitSlots(cities.length)
        ).map((slot) => {
          const city = cities[wrapCityIndex(index + slot, cities.length)],
            photo = photos.find((p) => p.key === city.key);
          return (
            <article
              key={city.key}
              className="cm-orbit-card"
              data-slot={slot}
              style={cityOrbitPose(slot - drag, viewport)}
              aria-hidden={Math.abs(slot - drag) >= 2.75 || undefined}
              aria-label={`Unternehmernetzwerk ${city.city}${slot === 0 ? ", im Vordergrund" : ""}`}
            >
              {photo && imagesEnabled && (
                <img
                  src={`/images/optimized/city-${city.key}-480.webp`}
                  srcSet={`/images/optimized/city-${city.key}-480.webp 480w, /images/optimized/city-${city.key}-960.webp 960w`}
                  sizes="(max-width: 700px) 225px, 370px"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  alt={`Stadtansicht ${city.city}`}
                  width="440"
                  height="360"
                  draggable={false}
                />
              )}
              <div className="cm-orbit-caption">
                {city.key==="aachen" && <a className="cm-required-credit" href={photo?.sourceUrl} target="_blank" rel="noopener noreferrer">© CEphoto, Uwe Aranas · CC BY-SA 3.0</a>}
                <small>Unternehmernetzwerk</small>
                <h3>{city.city}</h3>
                {slot === 0 ? (
                  <Link
                    href={
                      (prefix ? `${prefix}${city.route}` : city.route) as never
                    }
                    draggable={false}
                  >
                    Netzwerk kennenlernen
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => step(slot)}
                    aria-label={`${city.city} nach vorne drehen`}
                  >
                    Stadt nach vorne drehen
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="cm-orbit-controls">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={cities.length < 2}
          aria-label="Vorherige Stadt"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="m14 5-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="cm-orbit-sr" role="status" aria-live="polite">
          {cities.length
            ? `${cities[index].city} · ${index + 1} von ${cities.length}`
            : "Keine passende Stadt"}
        </p>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={cities.length < 2}
          aria-label="Nächste Stadt"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="m10 5 7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="cm-orbit-sr">
        <ul>
          {cities.map((city) => (
            <li key={city.key}>
              <Link
                tabIndex={-1}
                href={(prefix ? `${prefix}${city.route}` : city.route) as never}
              >
                {city.city}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
