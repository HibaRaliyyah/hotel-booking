import React from 'react'
import Hero from '../components/Hero'
import FeaturedDesitination from '../components/FeaturedDesitination'
import ExclusiveOffers from '../components/ExclusiveOffers'
import Testimonial from '../components/Testimonial'
import NewsLetter from '../components/NewsLetter'

const Home = () => {
  return (
    <div>
      <Hero />
      <FeaturedDesitination />
      <ExclusiveOffers />
      <Testimonial />
      <NewsLetter />
    </div>
  )
}

export default Home
