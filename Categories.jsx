import "./Categories.css";

function Categories() {
  return (
    <section className="categories">

      <h2>
        Explore Agricultural Categories 🌾
      </h2>

      <div className="category-container">

        <div className="category-card">
          <h3>🌽 Fresh Crops</h3>
          <p>
            Maize, rice, cassava, vegetables and fresh produce.
          </p>
        </div>


        <div className="category-card">
          <h3>🌱 Seeds & Seedlings</h3>
          <p>
            Quality planting materials for modern farms.
          </p>
        </div>


        <div className="category-card">
          <h3>🧪 Fertilizers & Inputs</h3>
          <p>
            Farm nutrients, agrochemicals and supplies.
          </p>
        </div>


        <div className="category-card">
          <h3>🚜 Machinery & Tools</h3>
          <p>
            Equipment, irrigation tools and farm technology.
          </p>
        </div>

      </div>

    </section>
  );
}

export default Categories;