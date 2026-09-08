import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Get user's role from Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        const savedRole = userData.role;

        // Make sure selected role matches saved role
        if (savedRole !== role) {
          alert(
            `This account is registered as a ${
              savedRole === "seller" ? "Seller" : "Buyer"
            }. Please select the correct account type.`
          );

          await auth.signOut();
          return;
        }

        alert(
          role === "seller"
            ? "Welcome back, Seller 🌱"
            : "Welcome back, Buyer 🌾"
        );

        // Send user to correct dashboard
        if (role === "seller") {
          navigate("/seller-dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        // For older accounts that don't have a users document yet
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: role,
          createdAt: serverTimestamp(),
        });

        alert(
          `Your account has been set up as a ${
            role === "seller" ? "Seller" : "Buyer"
          }.`
        );

        if (role === "seller") {
          navigate("/seller-dashboard");
        } else {
          navigate("/dashboard");
        }
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
      <h1>Login to Agrobaz 🌾</h1>

      <p>Welcome back to Agrobaz.</p>

      <form onSubmit={login}>
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
        />

        <h3>Login As</h3>

        <div>
          <label>
            <input
              type="radio"
              name="loginRole"
              value="buyer"
              checked={role === "buyer"}
              onChange={(e) => setRole(e.target.value)}
            />

            Buyer 🛒
          </label>
        </div>

        <div>
          <label>
            <input
              type="radio"
              name="loginRole"
              value="seller"
              checked={role === "seller"}
              onChange={(e) => setRole(e.target.value)}
            />

            Seller 🌱
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing In..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;