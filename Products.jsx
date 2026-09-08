import "./Products.css";

function Products() {
  return (
    <section className="products">

      <h2>
        Featured Agricultural Products 🌾
      </h2>

      <div className="product-container">

        <div className="product-card">
          <h3>🌽 Premium Maize</h3>
          <p>Verified farm supplier</p>
          <strong>$500 / ton</strong>
        </div>


        <div className="product-card">
          <h3>🌱 Hybrid Seeds</h3>
          <p>Quality planting materials</p>
          <strong>$100 / bag</strong>
        </div>


        <div className="product-card">
          <h3>🧪 Organic Fertilizer</h3>
          <p>Farm nutrients and inputs</p>
          <strong>$50</strong>
        </div>


        <div className="product-card">
          <h3>🚜 Farm Machinery</h3>
          <p>Modern farming equipment</p>
          <strong>$900</strong>
        </div>

      </div>

    </section>
  );
}

export default Products;