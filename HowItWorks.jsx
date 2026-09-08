function HowItWorks() {
  const steps = [
    {
      title: "Create an Account",
      description: "Sign up as a buyer or seller in just a few minutes.",
    },
    {
      title: "Explore or List Products",
      description: "Browse products or publish your own agricultural products.",
    },
    {
      title: "Connect & Trade",
      description: "Chat, negotiate, and place orders securely.",
    },
    {
      title: "Grow Together",
      description: "Build long-term business relationships around the world.",
    },
  ];

  return (
    <section className="how-it-works">
      <h2>How Agrobaz Works</h2>

      <div className="steps-grid">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            <h3>Step {index + 1}</h3>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;