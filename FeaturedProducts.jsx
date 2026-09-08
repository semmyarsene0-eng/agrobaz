function FeaturedProducts() {
  const products = [
    {
      name: "Premium Maize",
      country: "Uganda",
      price: "$250 / Ton",
    },
    {
      name: "Hybrid Seeds",
      country: "Kenya",
      price: "$45 / Pack",
    },
    {
      name: "Organic Fertilizer",
      country: "Rwanda",
      price: "$30 / Bag",
    },
    {
      name: "Irrigation Pump",
      country: "China",
      price: "$450",
    },
  ];

  return (
    <section className="featured-products">
      <h2>Featured Products</h2>

      <div className="products-grid">
        {products.map((product, index) => (
          <div key={index} className="product-card">
            <h3>{product.name}</h3>
            <p>📍 {product.country}</p>
            <p>{product.price}</p>
            <button>View Details</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturedProducts;