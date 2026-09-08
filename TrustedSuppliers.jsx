function TrustedSuppliers() {
  const suppliers = [
    {
      name: "Green Harvest Ltd",
      country: "Uganda",
      verified: "✅ Verified",
    },
    {
      name: "Kenya Seed Co.",
      country: "Kenya",
      verified: "✅ Verified",
    },
    {
      name: "Agro Export RDC",
      country: "DR Congo",
      verified: "✅ Verified",
    },
    {
      name: "FarmTech China",
      country: "China",
      verified: "✅ Verified",
    },
  ];

  return (
    <section className="trusted-suppliers">
      <h2>Trusted Suppliers</h2>

      <div className="suppliers-grid">
        {suppliers.map((supplier, index) => (
          <div key={index} className="supplier-card">
            <h3>{supplier.name}</h3>
            <p>🌍 {supplier.country}</p>
            <p>{supplier.verified}</p>
            <button>View Supplier</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TrustedSuppliers;