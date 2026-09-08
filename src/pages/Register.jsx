import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const register = async (e) => {
    e.preventDefault();

    if (!role) {
      alert("Please choose Buyer or Seller.");
      return;
    }

    try {
      setLoading(true);

      // Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Save user information + role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: serverTimestamp(),
      });

      alert(
        role === "seller"
          ? "Seller account created successfully 🌱"
          : "Buyer account created successfully 🌾"
      );

      // Send user to the correct dashboard
      if (role === "seller") {
        navigate("/seller-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Agrobaz Account 🌾</h1>

      <p>Choose how you want to use Agrobaz.</p>

      <form onSubmit={register}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <h3>Choose Account Type</h3>

        <div>
          <label>
            <input
              type="radio"
              name="role"
              value="buyer"
              checked={role === "buyer"}
              onChange={(e) => setRole(e.target.value)}
            />

            Buyer 🛒
          </label>

          <p>Buy crops, seeds, tools and other agricultural products.</p>
        </div>

        <div>
          <label>
            <input
              type="radio"
              name="role"
              value="seller"
              checked={role === "seller"}
              onChange={(e) => setRole(e.target.value)}
            />

            Seller 🌱
          </label>

          <p>Sell your agricultural products on Agrobaz.</p>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default Register;
