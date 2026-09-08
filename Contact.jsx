import { useState } from "react";
import "./Contact.css";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    alert("Thank you for contacting Agrobaz! 🌾");

    setForm({
      name: "",
      email: "",
      subject: "",
      message: ""
    });
  }

  return (
    <div className="contact-page">

      <section className="contact-hero">

        <h1>📞 Contact Agrobaz</h1>

        <p>
          We'd love to hear from you.
        </p>

      </section>

      <section className="contact-content">

        <div className="contact-info">

          <h2>Get in Touch</h2>

          <p>📧 support@agrobaz.com</p>

          <p>🌍 Global Agriculture Network</p>

          <p>🕒 Monday - Friday</p>

          <p>8:00 AM - 6:00 PM (EAT)</p>

        </div>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={form.subject}
            onChange={handleChange}
            required
          />

          <textarea
            name="message"
            placeholder="Your Message"
            rows="6"
            value={form.message}
            onChange={handleChange}
            required
          />

          <button type="submit">
            Send Message ✉️
          </button>

        </form>

      </section>

    </div>
  );
}

export default Contact;