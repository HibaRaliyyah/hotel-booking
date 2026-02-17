import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "../components/Hero";
import FeaturedDesitination from "../components/FeaturedDesitination";
import ExclusiveOffers from "../components/ExclusiveOffers";
import Testimonial from "../components/Testimonial";
import NewsLetter from "../components/NewsLetter";
import { useAppContext } from "../context/AppContext";

const Home = () => {
  const location = useLocation();
  const { addSearchedCity } = useAppContext();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const destination = params.get("destination");

    if (destination) {
      addSearchedCity(destination);
    }
  }, [location.search]);

  return (
    <div>
      <Hero />
      <FeaturedDesitination />
      <ExclusiveOffers />
      <Testimonial />
      <NewsLetter />
    </div>
  );
};

export default Home;
