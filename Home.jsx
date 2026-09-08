
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import PriceMapPreview from "../components/PriceMapPreview";
import Products from "../components/Products";
import SuppliersSection from "../components/Suppliers";
import Commission from "../components/Commission";

function Home() {
  return (
    <div className="home-page">

      {/* HERO */}
      <Hero />

      {/* CATEGORIES */}
      <Categories />

      {/* PRICE MAP */}
      <PriceMapPreview />

      {/* PRODUCTS */}
      <Products />

      {/* TRUSTED SUPPLIERS */}
      <SuppliersSection />

      {/* COMMISSION / AFFILIATE */}
      <Commission />

    </div>
  );
}

export default Home;

