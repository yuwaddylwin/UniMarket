import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Heart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AccommodationSection from "../Accommodation/AccommodationSection";
import Footer from "../Footer/footer";
import ItemsList from "../Items/ItemsList";
import { useAuthStore } from "../../store/useAuthStore";
import "./Home.css";

const SLIDES = [
  {
    image: "/Images/unimarket/hero-marketplace.webp",
    phoneImage: "/Images/unimarket/hero-marketplace-phone.jpg",
    tabletImage: "/Images/unimarket/hero-marketplace-tablet.jpg",
    eyebrow: "A marketplace made for students",
    title: "Buy and sell within your campus community.",
    description:
      "Pass useful items on, discover affordable finds, and keep good things in student hands.",
    alt: "Books, a keyboard and headphones on a study table in a bright campus lounge",
    position: "center",
  },
  {
    image: "/Images/unimarket/hero-student-room.webp",
    phoneImage: "/Images/unimarket/hero-room-phone.jpg",
    tabletImage: "/Images/unimarket/hero-room-tablet.jpg",
    eyebrow: "Student-friendly accommodation",
    title: "Find a place that feels like home.",
    description:
      "Explore practical places near university that fit student life and student budgets.",
    alt: "A bright student studio with a study desk and blue-and-white bedding",
    position: "center",
  },
  {
    image: "/Images/unimarket/hero-connect.jpg",
    phoneImage: "/Images/unimarket/hero-connect-phone.jpg",
    tabletImage: "/Images/unimarket/hero-connect-tablet.jpg",
    eyebrow: "Direct student connections",
    title: "Chat, connect, and make it happen.",
    description:
      "Speak directly with other students to ask questions, arrange details, and build trust.",
    alt: "Students connecting through marketplace chat in a university courtyard",
    position: "center",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const showSlide = (index) => {
    setActiveSlide((index + SLIDES.length) % SLIDES.length);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    showSlide(activeSlide + (distance < 0 ? 1 : -1));
  };

  return (
    <>
      <main className="home-page">
        <section
          className="home-carousel"
          aria-roledescription="carousel"
          aria-label="Discover UniMarket"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={handleTouchEnd}
        >
          {SLIDES.map((slide, index) => (
            <article
              className={`home-slide${index === 2 ? " home-slide--connect" : ""}${index === activeSlide ? " is-active" : ""}`}
              aria-hidden={index !== activeSlide}
              key={slide.title}
            >
              <picture>
                <source
                  media="(max-width: 600px) and (orientation: portrait)"
                  srcSet={slide.phoneImage}
                />
                <source
                  media="(orientation: portrait)"
                  srcSet={slide.tabletImage}
                />
                <img
                  src={slide.image}
                  alt={index === activeSlide ? slide.alt : ""}
                  style={{ objectPosition: slide.position }}
                />
              </picture>
              <div className="home-slide-overlay" aria-hidden="true" />
              <div className="home-slide-copy">
                <span>{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.description}</p>
              </div>
            </article>
          ))}

          <button
            className="home-carousel-arrow home-carousel-arrow--left"
            type="button"
            aria-label="Show previous image"
            onClick={() => showSlide(activeSlide - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="home-carousel-arrow home-carousel-arrow--right"
            type="button"
            aria-label="Show next image"
            onClick={() => showSlide(activeSlide + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>

          <div
            className="home-carousel-dots"
            aria-label="Choose carousel image"
          >
            {SLIDES.map((slide, index) => (
              <button
                className={index === activeSlide ? "is-active" : ""}
                type="button"
                aria-label={`Show image ${index + 1}: ${slide.title}`}
                aria-current={index === activeSlide ? "true" : undefined}
                onClick={() => showSlide(index)}
                key={slide.title}
              />
            ))}
          </div>

          <div className="home-carousel-status" aria-hidden="true">
            <span>{String(activeSlide + 1).padStart(2, "0")}</span>
            <i />
            <span>{String(SLIDES.length).padStart(2, "0")}</span>
          </div>
        </section>

        <section
          className="home-value-strip"
          aria-label="Why students use UniMarket"
        >
          <article>
            <span className="home-value-icon">
              <GraduationCap aria-hidden="true" />
            </span>
            <div>
              <h2>Student-exclusive</h2>
              <p>A marketplace made for student life.</p>
            </div>
          </article>
          <article>
            <span className="home-value-icon">
              <BadgeCheck aria-hidden="true" />
            </span>
            <div>
              <h2>Email verified</h2>
              <p>Verify your email to post and chat.</p>
            </div>
          </article>
          <article>
            <span className="home-value-icon">
              <Heart aria-hidden="true" />
            </span>
            <div>
              <h2>Built by a student</h2>
              <p>Created for our university community.</p>
            </div>
          </article>
        </section>

        <div id="home-discovery" className="home-discovery">
          <header className="home-discovery-intro">
            <span>Explore UniMarket</span>
            <h2>
              Everything students need,
              <br />
              right around campus.
            </h2>
          </header>
          <AccommodationSection />
          <ItemsList />
        </div>

        <section className="home-signup" aria-labelledby="home-signup-title">
          <div className="home-signup-card">
            {authUser ? (
              <>
                <span className="home-signup-eyebrow">
                  Welcome back to UniMarket
                </span>
                <h2 id="home-signup-title">
                  Have something to share?
                  <br />
                  <em>Create your next listing.</em>
                </h2>
                <p>
                  Post an item or accommodation for students in your campus
                  community.
                </p>
                <button type="button" onClick={() => navigate("/post")}>
                  Post a Listing
                </button>
              </>
            ) : (
              <>
                <span className="home-signup-eyebrow">
                  Join your campus community
                </span>
                <h2 id="home-signup-title">
                  Ready to find your need &<br />
                  <em>Sell what you don't?</em>
                </h2>
                <p>
                  Discover items, find accommodation, and connect with students
                  around your campus.
                </p>
                <button type="button" onClick={() => navigate("/signup")}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
